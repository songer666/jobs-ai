import { Resend } from 'resend';

export function createResend(apiKey: string) {
    return new Resend(apiKey);
}

export interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
    from?: string;
}

export async function sendEmail(resend: Resend, options: SendEmailOptions) {
    const {
        to,
        subject,
        html,
        from = 'JobsAI <noreply@mail.jobsai.top>',
    } = options;

    return resend.emails.send({
        from,
        to,
        subject,
        html,
    });
}


export interface SendOTPEmailOptions {
    to: string;
    code: string;
    type: 'email-verification' | 'forget-password' | 'sign-in';
    appName?: string;
    expiresInMinutes?: number;
}

export function generateOTPEmailContent(options: SendOTPEmailOptions) {
    const { code, type, appName = '考试系统', expiresInMinutes = 5 } = options;
    
    const typeText = {
        'email-verification': '邮箱验证',
        'forget-password': '密码找回',
        'sign-in': '登录验证',
    }[type];
    
    const subject = `【${appName}】${typeText}验证码：${code}`;
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .code { font-size: 32px; font-weight: bold; color: #1a73e8; letter-spacing: 4px; padding: 20px; background: #f5f5f5; border-radius: 8px; text-align: center; margin: 20px 0; }
        .expire { color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>${typeText}</h1>
        <p>您的验证码是：</p>
        <div class="code">${code}</div>
        <p class="expire">验证码有效期为 ${expiresInMinutes} 分钟，请及时使用</p>
        <p>如果这不是您的操作，请忽略此邮件。</p>
    </div>
</body>
</html>
    `.trim();
    
    return { subject, html };
}

export async function sendOTPEmail(resend: Resend, options: SendOTPEmailOptions) {
    const { to } = options;
    const { subject, html } = generateOTPEmailContent(options);
    
    return sendEmail(resend, { to, subject, html });
}
