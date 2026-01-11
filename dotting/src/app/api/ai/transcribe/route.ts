import { NextRequest, NextResponse } from 'next/server'
import { openai, MODELS } from '@/lib/openai'
import { requirePayment } from '@/lib/payment-gate'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const sessionId = formData.get('sessionId') as string

    if (!audioFile) {
      return NextResponse.json(
        { error: '오디오 파일이 필요합니다.' },
        { status: 400 }
      )
    }
    
    // 결제 게이트: paid 상태가 아니면 Whisper 호출 차단
    if (sessionId) {
      const paymentGate = await requirePayment(sessionId)
      if (!paymentGate.allowed) {
        return paymentGate.response
      }
    }

    // Whisper API로 음성→텍스트 변환
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: MODELS.WHISPER,
      language: 'ko',
      response_format: 'text',
    })

    return NextResponse.json({ 
      text: transcription,
    })

  } catch (error) {
    console.error('Transcribe Error:', error)
    return NextResponse.json(
      { error: '음성 변환 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}
