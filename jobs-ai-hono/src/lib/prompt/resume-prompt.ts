export const RESUME_CHAT_QUESTIONS = [
    {
        id: 'name',
        question: '你好！我是你的简历助手。首先，请告诉我你的姓名？',
        field: 'basicInfo.name',
    },
    {
        id: 'phone',
        question: '请提供你的联系电话：',
        field: 'basicInfo.phone',
    },
    {
        id: 'email',
        question: '请提供你的邮箱地址：',
        field: 'basicInfo.email',
    },
    {
        id: 'location',
        question: '你目前所在的城市是？',
        field: 'basicInfo.location',
    },
    {
        id: 'jobTarget',
        question: '你的目标职位是什么？期望薪资范围是多少？',
        field: 'jobTarget',
    },
    {
        id: 'workYears',
        question: '你有多少年的工作经验？',
        field: 'jobTarget.workYears',
    },
    {
        id: 'education',
        question: '请介绍你的教育背景（学校、专业、学历、毕业时间）：',
        field: 'education',
    },
    {
        id: 'experience',
        question: '请介绍你的工作经历（公司名称、职位、工作时间、主要职责和成就）：',
        field: 'experience',
    },
    {
        id: 'projects',
        question: '请介绍你参与过的重要项目（项目名称、你的角色、使用的技术、项目成果）：',
        field: 'projects',
    },
    {
        id: 'skills',
        question: '请列出你的专业技能（编程语言、框架、工具等）：',
        field: 'skills',
    },
    {
        id: 'certificates',
        question: '你有哪些相关的证书或资质？（如果没有可以跳过）',
        field: 'certificates',
        optional: true,
    },
    {
        id: 'selfEvaluation',
        question: '最后，请简单介绍一下你自己，包括你的优势和职业目标：',
        field: 'selfEvaluation',
    },
];

export function getResumeChatSystemPrompt(): string {
    return `你是一个专业的简历助手，帮助用户收集信息来生成简历。

你的任务是：
1. 按照预设的问题顺序，逐一询问用户信息
2. 理解用户的回答，提取关键信息
3. 如果用户的回答不完整或不清楚，礼貌地请求更多细节
4. 对于可选问题，如果用户表示没有或想跳过，直接进入下一个问题
5. 保持友好、专业的语气

回答格式要求：
- 简洁明了，不要过于冗长
- 在确认收到信息后，自然地过渡到下一个问题
- 如果用户提供了额外信息，也要记录下来

当所有必要信息收集完毕后，告知用户信息收集完成，可以开始生成简历。`;
}

export function getResumeGenerationPrompt(
    userInfo: Record<string, any>,
    stylePrompt: string,
    jobDescription?: string
): string {
    const jobContext = jobDescription 
        ? `\n\n目标职位描述：\n${jobDescription}\n\n请根据目标职位优化简历内容，突出相关经验和技能。`
        : '';

    return `你是一个专业的简历撰写专家。请根据以下用户信息生成一份专业、美观的 HTML 格式简历。

用户信息：
${JSON.stringify(userInfo, null, 2)}
${jobContext}

样式要求：
${stylePrompt}

**严格遵守以下 HTML 结构和样式规范：**

1. 整体布局：
   - 最大宽度 800px，居中显示
   - 白色背景，适当的内边距和圆角
   - 使用 box-shadow 增加层次感

2. 头部区域（header）- **非常重要**：
   - **必须严格遵循用户在「样式要求」中指定的配色方案**
   - 如果用户指定了主色调和背景色，header 背景必须使用用户指定的颜色
   - 如果用户未指定配色，才使用默认的深色背景
   - 姓名使用大号字体，居中或左对齐，颜色与背景形成对比
   - 职位/头衔在姓名下方，稍小字号
   - 联系方式（电话、邮箱、地址、GitHub等）使用**水平排列**，用分隔符隔开
   - 联系方式使用 flexbox 布局：display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;
   - **禁止**将联系方式垂直排列在右侧
   - **重要**：GitHub、LinkedIn 等链接必须显示为纯文本网址（如 https://github.com/username），不要使用 <a> 标签或超链接，因为 Word 无法识别 HTML 超链接

3. 内容区域：
   - 各模块使用清晰的标题（如：个人简介、工作经历、项目经验、教育背景、技能特长）
   - 模块标题颜色应与 header 配色协调
   - 工作经历和项目经验包含：公司/项目名、时间、职位、职责描述
   - 技能使用标签样式（圆角背景色）

4. 字体和颜色：
   - 使用系统字体：font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Microsoft YaHei', sans-serif;
   - 主标题颜色应与用户指定的配色方案协调
   - 正文：#333333
   - 次要文字：#666666

**示例 HTML 结构（根据用户样式要求调整配色）：**
<div style="max-width:800px;margin:0 auto;background:#fff;box-shadow:0 2px 10px rgba(0,0,0,0.1);border-radius:8px;overflow:hidden;">
  <header style="background:[用户指定的背景色];color:[与背景对比的文字颜色];padding:40px 30px;text-align:center;">
    <h1 style="margin:0;font-size:32px;">姓名</h1>
    <p style="margin:8px 0 0;font-size:18px;opacity:0.9;">职位头衔</p>
    <div style="display:flex;justify-content:center;gap:20px;flex-wrap:wrap;margin-top:15px;font-size:14px;">
      <span>📱 13800138000</span>
      <span>📧 email@example.com</span>
      <span>📍 北京</span>
      <span>💼 https://github.com/username</span>
    </div>
  </header>
  <main style="padding:30px;">
    <section style="margin-bottom:25px;">
      <h2 style="color:[与header协调的颜色];border-bottom:2px solid [与header协调的颜色];padding-bottom:8px;">个人简介</h2>
      <p>...</p>
    </section>
    <!-- 更多 section -->
  </main>
</div>

**输出要求：**
- 直接输出 HTML 代码，不要包含 \`\`\`html 代码块标记
- 不要输出任何说明文字，只输出纯 HTML
- 所有样式必须使用内联 style 属性
- 内容要专业、简洁、有力，使用动词开头描述成就
- **关键**：所有网址链接（GitHub、LinkedIn、个人网站等）必须以纯文本形式显示完整 URL，不要使用 <a> 标签，例如：https://github.com/username 而不是 <a href="...">GitHub</a>`;
}

export function parseResumeFromChat(messages: Array<{role: string; content: string}>): Record<string, any> {
    const collectedInfo: Record<string, any> = {
        basicInfo: {},
        jobTarget: {},
        education: [],
        experience: [],
        projects: [],
        skills: [],
        certificates: [],
        selfEvaluation: '',
    };

    // 这里可以添加更复杂的解析逻辑
    // 目前简单地将用户消息按顺序映射到字段
    const userMessages = messages.filter(m => m.role === 'user');
    
    RESUME_CHAT_QUESTIONS.forEach((q, index) => {
        if (userMessages[index]) {
            const content = userMessages[index].content;
            const fieldPath = q.field.split('.');
            
            if (fieldPath.length === 1) {
                collectedInfo[fieldPath[0]] = content;
            } else if (fieldPath.length === 2) {
                if (!collectedInfo[fieldPath[0]]) {
                    collectedInfo[fieldPath[0]] = {};
                }
                collectedInfo[fieldPath[0]][fieldPath[1]] = content;
            }
        }
    });

    return collectedInfo;
}
