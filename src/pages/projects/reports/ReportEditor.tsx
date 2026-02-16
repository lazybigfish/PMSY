
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContextNew';
import { Loader2, Save, Wand2, FileText, Download, ArrowLeft } from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const ReportEditor = () => {
  const { projectId, reportId } = useParams<{ projectId: string; reportId?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  
  const [report, setReport] = useState({
    title: '',
    type: 'weekly',
    status: 'draft',
    content: {
      overview: '',
      risks: '',
      completed_work: '',
      plan: ''
    }
  });

  useEffect(() => {
    if (reportId && reportId !== 'new') {
      fetchReport(reportId);
    } else {
      // Set default title and type based on URL params
      const typeParam = searchParams.get('type');
      const type = (typeParam === 'daily' || typeParam === 'weekly') ? typeParam : 'weekly';
      
      setReport(prev => ({ 
        ...prev, 
        type,
        title: `${type === 'weekly' ? '周报' : '日报'} - ${new Date().toLocaleDateString()}` 
      }));

      // Auto-generate draft content
      generateDraftContent(type);
    }
  }, [reportId, searchParams]);

  const generateDraftContent = async (type: 'daily' | 'weekly') => {
    try {
      const now = new Date();
      let startDate = new Date();
      
      if (type === 'weekly') {
        // Get Monday of current week
        const day = now.getDay() || 7;
        startDate.setDate(now.getDate() - day + 1);
        startDate.setHours(0, 0, 0, 0);
      } else {
        // Daily: Start of today
        startDate.setHours(0, 0, 0, 0);
      }
      
      const startDateStr = startDate.toISOString();

      // Fetch Data
      const [
        completedRes,
        risksRes,
        plannedRes,
        progressRes,
        modulesRes,
        milestonesRes,
        newRisksRes,
        projectRes
      ] = await Promise.all([
        // 1. Completed Tasks (Time range)
        api.db
          .from('tasks')
          .select('*')
          .eq('project_id', projectId)
          .eq('status', 'done')
          .gte('completed_at', startDateStr),
        // 2. Active Risks (Current major risks)
        api.db
          .from('risks')
          .select('*')
          .eq('project_id', projectId)
          .neq('status', 'closed')
          .in('level', ['high', 'medium']),
        // 3. Planned Tasks (Due date in future)
        api.db
          .from('tasks')
          .select('*')
          .eq('project_id', projectId)
          .neq('status', 'done')
          .gte('due_date', new Date().toISOString()),
        // 4. Progress Logs (Time range) - 先获取日志，再关联任务
        api.db
          .from('task_progress_logs')
          .select('*')
          .gte('created_at', startDateStr)
          .order('created_at', { ascending: false }),
        // 5. Project Modules
        api.db
          .from('project_modules')
          .select('*')
          .eq('project_id', projectId),
        // 6. Milestones
        api.db
          .from('project_milestones')
          .select('*')
          .eq('project_id', projectId)
          .eq('status', 'in_progress'),
        // 7. New Risks (Discovered in time range)
        api.db
          .from('risks')
          .select('*')
          .eq('project_id', projectId)
          .gte('created_at', startDateStr),
        // 8. Project Info
        api.db
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single()
      ]);

      const completedTasks = completedRes.data || [];
      const activeRisks = risksRes.data || [];
      const plannedTasks = plannedRes.data || [];
      let progressLogs = progressRes.data || [];
      const modules = modulesRes.data || [];
      const milestones = milestonesRes.data || [];
      const newRisks = newRisksRes.data || [];
      const project = projectRes.data;

      // 关联进度日志与任务
      if (progressLogs.length > 0) {
        const taskIds = progressLogs.map(log => log.task_id).filter(Boolean);
        if (taskIds.length > 0) {
          const { data: tasksData } = await api.db.from('tasks').select('id, title').in('id', taskIds);
          const tasksMap = new Map(tasksData?.map(t => [t.id, t]) || []);
          progressLogs = progressLogs.map(log => ({
            ...log,
            task: tasksMap.get(log.task_id)
          }));
        }
      }

      // --- Formatting Logic ---

      let overviewText = '';
      let completedWorkText = '';
      let risksText = '';
      let planText = '';

      if (type === 'daily') {
        // === Daily Report Template ===
        
        // 1. Today's Completion
        completedWorkText = `1. 任务完成情况\n`;
        completedWorkText += completedTasks.length > 0 
          ? completedTasks.map(t => `   - [已完成] ${t.title}`).join('\n') 
          : '   - 暂无已完成任务';
        
        completedWorkText += `\n\n2. 任务进度更新\n`;
        completedWorkText += progressLogs.length > 0
            // @ts-ignore
          ? progressLogs.map(l => `   - ${l.task?.title || '未知任务'}: 进度更新至 ${l.progress}% (${l.description})`).join('\n')
          : '   - 暂无进度更新';

        completedWorkText += `\n\n3. 功能模块进展\n`;
        completedWorkText += modules.length > 0
            ? modules.map(m => `   - ${m.name}: ${m.status === 'completed' ? '已完成' : m.status === 'in_progress' ? '进行中' : '未开始'}`).join('\n')
            : '   - 暂无模块信息';
            
        completedWorkText += `\n\n4. 里程碑进展\n`;
        completedWorkText += milestones.length > 0
            ? milestones.map(m => `   - ${m.name}: 进行中`).join('\n')
            : '   - 当前无进行中里程碑';

        // 2. Risks & Issues
        risksText = `1. 当前重大风险\n`;
        risksText += activeRisks.length > 0
          ? activeRisks.map(r => `   - [${r.level === 'high' ? '高' : '中'}] ${r.title} (${r.status === 'open' ? '开放' : '处理中'})`).join('\n')
          : '   - 暂无重大风险';
        
        risksText += `\n\n2. 今日发现的风险\n`;
        risksText += newRisks.length > 0
          ? newRisks.map(r => `   - [新] ${r.title}`).join('\n')
          : '   - 今日无新发现风险';
          
        risksText += `\n\n3. 遇到的问题（请手动填写）\n   - `;

        // 3. Tomorrow's Plan
        planText = `1. 计划完成的任务\n`;
        planText += plannedTasks.length > 0
            ? plannedTasks.map(t => `   - ${t.title}`).join('\n')
            : '   - 暂无特定计划任务';
            
        planText += `\n\n2. 重点关注事项（请手动填写）\n   - `;

        // Overview (Not explicitly in Daily template, but good to have)
        overviewText = `本日完成任务 ${completedTasks.length} 个，进度更新 ${progressLogs.length} 条。`;

      } else {
        // === Weekly Report Template ===

        // 1. Overview
        overviewText = `1. 项目整体进度: ${project?.status === 'completed' ? '已完成' : '进行中'}\n`;
        overviewText += `2. 本周主要工作内容概述（自动汇总）:\n`;
        overviewText += `   本周共完成任务 ${completedTasks.length} 个，解决风险 ${risksRes.data?.filter(r => r.status === 'closed').length || 0} 个。`;

        // 2. Weekly Completion
        completedWorkText = `1. 任务完成情况\n`;
        completedWorkText += `   - 本周完成任务统计: ${completedTasks.length} 个\n`;
        completedWorkText += completedTasks.length > 0 
          ? completedTasks.map(t => `     * ${t.title}`).join('\n') 
          : '';
        
        completedWorkText += `\n\n2. 功能模块进展\n`;
        completedWorkText += modules.map(m => `   - ${m.name}: ${m.status}`).join('\n');

        completedWorkText += `\n\n3. 里程碑进展\n`;
        completedWorkText += milestones.length > 0
            ? milestones.map(m => `   - ${m.name}: 进行中 (开始: ${new Date(m.start_date).toLocaleDateString()})`).join('\n')
            : '   - 本周无活跃里程碑';

        // 3. Risks
        risksText = `1. 当前重大风险\n`;
        risksText += activeRisks.length > 0
          ? activeRisks.map(r => `   - [${r.level}] ${r.title}: ${r.impact || '无影响描述'} (应对: ${r.mitigation_plan || '无'})`).join('\n')
          : '   - 暂无';

        risksText += `\n\n2. 本周发现的风险\n`;
        risksText += newRisks.length > 0
          ? newRisks.map(r => `   - ${r.title} (${r.level})`).join('\n')
          : '   - 本周无新风险';
          
        risksText += `\n\n3. 遇到的问题及解决方案（请手动填写）\n   - `;

        // 4. Next Week Plan
        planText = `1. 计划完成的任务\n`;
        planText += plannedTasks.map(t => `   - ${t.title} (截止: ${new Date(t.due_date).toLocaleDateString()})`).join('\n');
        
        planText += `\n\n2. 里程碑目标（请手动填写）\n   - \n`;
        planText += `3. 重点关注事项（请手动填写）\n   - `;
      }

      setReport(prev => ({
        ...prev,
        content: {
          overview: overviewText,
          risks: risksText,
          completed_work: completedWorkText,
          plan: planText
        }
      }));

    } catch (error) {
      console.error('Error generating draft content:', error);
    }
  };

  const fetchReport = async (id: string) => {
    try {
      setLoading(true);
      const { data, error } = await api.db.from('reports').select('*').eq('id', id).single();
      if (error) throw error;
      if (data) setReport(data);
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (status: 'draft' | 'published') => {
    if (!user || !projectId) return;
    setLoading(true);
    try {
      const payload = {
        project_id: projectId,
        title: report.title,
        type: report.type,
        status: status,
        content: report.content,
        created_by: user.id
      };

      let error;
      if (reportId && reportId !== 'new') {
        const { error: err } = await api.db.from('reports').update(payload).eq('id', reportId);
        error = err;
      } else {
        const { error: err } = await api.db.from('reports').insert([payload]);
        error = err;
      }

      if (error) throw error;
      navigate(`/projects/${projectId}?tab=reports`);
    } catch (error) {
      console.error('Error saving report:', error);
      alert('保存报告失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAIAnalysis = async () => {
    setAiLoading(true);
    try {
        // 1. Fetch AI Config
        const { data: providers } = await api.db.from('ai_providers').select('*').eq('is_active', true).limit(1);
        const { data: roles } = await api.db.from('ai_roles').select('*').eq('is_default', true).limit(1);
        
        if (!providers || providers.length === 0) {
            alert('未找到可用的AI服务提供商，请在系统设置中配置。');
            return;
        }
        
        const provider = providers[0];
        const role = roles && roles.length > 0 ? roles[0] : { system_prompt: '你是一位资深项目经理。' };

        // 2. Fetch Project Data
        const { data: tasks } = await api.db.from('tasks').select('*').eq('project_id', projectId);
        const { data: modules } = await api.db.from('project_modules').select('*').eq('project_id', projectId);
        const { data: risks } = await api.db.from('risks').select('*').eq('project_id', projectId);

        // 3. Construct Prompt
        const context = JSON.stringify({ tasks, modules, risks });
        const prompt = `
            基于以下项目数据：${context}
            
            请生成一份项目报告，包含以下4个部分：
            1. 项目概况 (overview)：基于功能模块的整体进度
            2. 风险与问题 (risks)：高风险项
            3. 已完成工作 (completed_work)：已完成的任务
            4. 工作计划 (plan)：即将进行的任务
            
            请仅返回一个有效的JSON对象，包含key: "overview", "risks", "completed_work", "plan"。内容使用中文。
        `;

        // 4. Call AI API
        const response = await fetch(provider.api_endpoint + '/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${provider.api_key}`
            },
            body: JSON.stringify({
                model: provider.model,
                messages: [
                    { role: 'system', content: role.system_prompt },
                    { role: 'user', content: prompt }
                ]
            })
        });

        const data = await response.json();
        const contentStr = data.choices[0].message.content;
        
        // Parse JSON from response
        const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            setReport(prev => ({
                ...prev,
                content: {
                    overview: result.overview || prev.content.overview,
                    risks: result.risks || prev.content.risks,
                    completed_work: result.completed_work || prev.content.completed_work,
                    plan: result.plan || prev.content.plan
                }
            }));
        } else {
            alert('AI返回格式错误');
        }

    } catch (error) {
        console.error('AI Analysis failed:', error);
        alert('AI分析失败，请检查控制台或AI配置。');
    } finally {
        setAiLoading(false);
    }
  };

  const exportWord = () => {
    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({
                    text: report.title,
                    heading: HeadingLevel.TITLE,
                    alignment: AlignmentType.CENTER,
                }),
                new Paragraph({ text: "" }), // Spacer
                new Paragraph({
                    text: "1. 项目概况",
                    heading: HeadingLevel.HEADING_1,
                }),
                new Paragraph({
                    children: [new TextRun(report.content.overview)],
                }),
                new Paragraph({
                    text: "2. 风险与问题",
                    heading: HeadingLevel.HEADING_1,
                }),
                new Paragraph({
                    children: [new TextRun(report.content.risks)],
                }),
                new Paragraph({
                    text: "3. 已完成工作",
                    heading: HeadingLevel.HEADING_1,
                }),
                new Paragraph({
                    children: [new TextRun(report.content.completed_work)],
                }),
                new Paragraph({
                    text: "4. 工作计划",
                    heading: HeadingLevel.HEADING_1,
                }),
                new Paragraph({
                    children: [new TextRun(report.content.plan)],
                }),
            ],
        }],
    });

    Packer.toBlob(doc).then((blob) => {
        saveAs(blob, `${report.title}.docx`);
    });
  };

  const exportPDF = () => {
    const input = document.getElementById('report-content');
    if (input) {
        html2canvas(input).then((canvas) => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF();
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`${report.title}.pdf`);
        });
    }
  };

  if (loading) return <Loader2 className="animate-spin h-8 w-8 text-indigo-600 mx-auto mt-10" />;

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6">
        <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
                <button 
                    onClick={() => navigate(`/projects/${projectId}?tab=reports`)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-gray-600" />
                </button>
                <h1 className="text-2xl font-bold">
                    {reportId === 'new' ? '新建报告' : '编辑报告'}
                </h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    report.type === 'weekly' ? 'bg-indigo-100 text-indigo-800' : 'bg-green-100 text-green-800'
                }`}>
                    {report.type === 'weekly' ? '周报' : '日报'}
                </span>
            </div>
            <div className="space-x-2 flex">
                <button onClick={handleAIAnalysis} disabled={aiLoading} className="flex items-center px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50">
                    {aiLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Wand2 className="h-4 w-4 mr-2" />}
                    AI 分析
                </button>
                <button onClick={exportWord} className="flex items-center px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    <FileText className="h-4 w-4 mr-2" /> Word
                </button>
                <button onClick={exportPDF} className="flex items-center px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                    <Download className="h-4 w-4 mr-2" /> PDF
                </button>
                <button onClick={() => handleSave('published')} className="flex items-center px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                    <Save className="h-4 w-4 mr-2" /> 发布
                </button>
            </div>
        </div>

        <div className="bg-white p-6 rounded shadow space-y-4" id="report-content">
            <input 
                className="w-full text-2xl font-bold border-b pb-2 focus:outline-none" 
                value={report.title} 
                onChange={e => setReport({...report, title: e.target.value})} 
                placeholder="报告标题"
            />
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">1. 项目概况</label>
                <textarea 
                    className="w-full border rounded p-2 h-32 focus:ring-2 focus:ring-indigo-500" 
                    value={report.content.overview} 
                    onChange={e => setReport({...report, content: {...report.content, overview: e.target.value}})}
                    placeholder="描述项目当前状态..."
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">2. 风险与问题</label>
                <textarea 
                    className="w-full border rounded p-2 h-32 focus:ring-2 focus:ring-indigo-500" 
                    value={report.content.risks} 
                    onChange={e => setReport({...report, content: {...report.content, risks: e.target.value}})}
                    placeholder="列出当前风险..."
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">3. 已完成工作</label>
                <textarea 
                    className="w-full border rounded p-2 h-32 focus:ring-2 focus:ring-indigo-500" 
                    value={report.content.completed_work} 
                    onChange={e => setReport({...report, content: {...report.content, completed_work: e.target.value}})}
                    placeholder="列出本周/今日完成的任务..."
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">4. 工作计划</label>
                <textarea 
                    className="w-full border rounded p-2 h-32 focus:ring-2 focus:ring-indigo-500" 
                    value={report.content.plan} 
                    onChange={e => setReport({...report, content: {...report.content, plan: e.target.value}})}
                    placeholder="下一步计划..."
                />
            </div>
        </div>
    </div>
  );
};

export default ReportEditor;
