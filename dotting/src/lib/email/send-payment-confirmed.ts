import { PackageType } from '@/types/database'
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

interface SendPaymentConfirmedEmailParams {
  userEmail: string
  userName: string
  orderId: string
  packageType: PackageType
  subjectName: string
  sessionId: string
}

export async function sendPaymentConfirmedEmail(params: SendPaymentConfirmedEmailParams) {
  const { userEmail, userName, orderId, packageType, subjectName, sessionId } = params

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const interviewUrl = `${baseUrl}/dashboard/project/${sessionId}`

  // 패키지 타입 분기
  const isEssay = packageType === 'pdf_only'
  const isStory = packageType === 'standard'
  const isHeritage = packageType === 'premium'
  
  // 패키지별 활성 점 개수
  const activeDotsCount = isEssay ? 1 : isStory ? 2 : 3

  // 패키지별 워딩 (절제된 프리미엄)
  const headline = isEssay
    ? '첫 번째 기록의 조각이 찍혔습니다'
    : isStory
    ? `${subjectName}님의 이야기가 시작됩니다`
    : `${subjectName}님의 기록을 위한 준비를 마쳤습니다`

  const bodyText = '준비가 완료되었습니다.\n기록을 시작해 주세요.'

  const ctaText = isHeritage ? '첫 번째 점 찍기' : '기록 시작하기'

  const emailSubject = `[도팅 편집실] ${subjectName}님의 기록을 시작할 준비를 마쳤습니다`
  const emailBody = `안녕하세요, ${userName}님

${subjectName}님의 소중한 기록이 편집실에 도착했습니다.

${bodyText}

[${ctaText}]
${interviewUrl}

DOTTING${isHeritage ? '\n\n도팅의 편집장이 기록을 위한 준비를 시작합니다.' : ''}`
  
  // Table 기반 견고한 HTML (Outlook/Gmail 호환)
  const emailHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@300;400;600&display=swap" rel="stylesheet">
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Batang, Gungsuh, Georgia, 'Times New Roman', serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: 'Noto Serif KR', Batang, Gungsuh, Georgia, 'Times New Roman', serif; background-color: #FFFCF7; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FFFCF7; padding: 64px 20px;">
    <tr>
      <td align="center">
        <!-- Container -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04), 0 8px 24px rgba(0, 0, 0, 0.06), 0 16px 48px rgba(0, 0, 0, 0.08);">
          <tr>
            <td style="padding: 64px 48px; text-align: center;">
              
              <!-- Signature Dots (3단계) -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 48px;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        ${[0, 1, 2].map(index => {
                          const isActive = index < activeDotsCount
                          const dotStyle = isActive && isHeritage
                            ? 'background: linear-gradient(135deg, #E5D4B8 0%, #F5E6D3 50%, #E5D4B8 100%); box-shadow: 0 0 4px rgba(212, 165, 116, 0.2);'
                            : isActive
                            ? 'background-color: #1A365D;'
                            : 'background-color: rgba(212, 165, 116, 0.3);'
                          
                          return `<td style="padding: 0 4px;">
                            <div style="width: 6px; height: 6px; border-radius: 50%; ${dotStyle}"></div>
                          </td>`
                        }).join('')}
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Headline -->
              <h1 style="margin: 0 0 32px 0; font-size: 28px; font-weight: 600; color: #1A365D; line-height: 1.4; letter-spacing: -0.02em; word-break: keep-all;">
                ${headline}
              </h1>
              
              <!-- Body Text -->
              <p style="margin: 0 0 48px 0; font-size: 17px; font-weight: 300; color: #4A5568; line-height: 1.8; word-break: keep-all; white-space: pre-line;">
                안녕하세요, ${userName}님<br><br>
                ${bodyText}
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 32px;">
                <tr>
                  <td align="center">
                    <a href="${interviewUrl}" style="display: inline-block; background-color: #1A365D; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 16px; font-weight: 600; word-break: keep-all;">
                      ${ctaText}
                    </a>
                    ${isHeritage ? `<br><span style="display: block; margin-top: 8px; font-size: 12px; color: #718096; word-break: keep-all;">기록 시작하기</span>` : ''}
                  </td>
                </tr>
              </table>
              
              ${isHeritage ? `
              <!-- Heritage 전용: 편집장의 편지 -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 64px;">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0; font-size: 14px; font-weight: 300; font-style: italic; color: #92400E; line-height: 1.6; font-family: 'Noto Serif KR', Batang, Gungsuh, Georgia, serif;">
                      도팅의 편집장이 기록을 위한 준비를 시작합니다.
                    </p>
                  </td>
                </tr>
              </table>
              ` : ''}
              
              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E5E7EB;">
                <tr>
                  <td align="center" style="font-size: 14px; color: #718096;">
                    DOTTING
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  // AWS SES 설정 확인
  const awsAccessKey = process.env.AWS_ACCESS_KEY_ID
  const awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY
  const awsRegion = process.env.AWS_REGION || 'ap-northeast-2'
  const senderEmail = process.env.AWS_SES_SENDER_EMAIL || 'ryan_jj@naver.com'
  
  if (!awsAccessKey || !awsSecretKey) {
    console.warn('[DOTTING Email] AWS credentials not configured. Email logged only.')
    console.log('[DOTTING Email] Payment Confirmed:', {
      to: userEmail,
      subject: emailSubject,
    })
    return { success: true, message: 'Email logged (AWS SES not configured)' }
  }

  try {
    // AWS SES 클라이언트 생성
    const sesClient = new SESClient({
      region: awsRegion,
      credentials: {
        accessKeyId: awsAccessKey,
        secretAccessKey: awsSecretKey,
      },
    })

    // 이메일 발송 명령
    const command = new SendEmailCommand({
      Source: `DOTTING <${senderEmail}>`,
      Destination: {
        ToAddresses: [userEmail],
      },
      Message: {
        Subject: {
          Data: emailSubject,
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: emailBody,
            Charset: 'UTF-8',
          },
          Html: {
            Data: emailHtml,
            Charset: 'UTF-8',
          },
        },
      },
    })

    const response = await sesClient.send(command)
    
    console.log('[DOTTING Email] Sent successfully via AWS SES:', {
      messageId: response.MessageId,
      to: userEmail,
    })
    
    return { success: true, messageId: response.MessageId, provider: 'aws-ses' }
    
  } catch (error) {
    console.error('[DOTTING Email] AWS SES error:', error)
    
    // Fallback: 콘솔 로그
    console.log('[DOTTING Email] Payment Confirmed (fallback):', {
      to: userEmail,
      subject: emailSubject,
    })
    
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
