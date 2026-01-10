import { NextRequest, NextResponse } from 'next/server'
import { openai, MODELS } from '@/lib/openai'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json(
        { error: '오디오 파일이 필요합니다.' },
        { status: 400 }
      )
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
