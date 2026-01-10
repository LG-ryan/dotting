'use client'

/**
 * DOTTING PDF Document - @react-pdf/renderer 기반
 * 
 * - A5 규격 (148 x 210 mm)
 * - 한글 폰트: Noto Sans KR (Google Fonts CDN)
 * - 챕터별 페이지 분할
 */

import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import type { ParagraphType } from '@/types/database'

// 한글 폰트 등록 (Noto Sans KR)
Font.register({
  family: 'NotoSansKR',
  fonts: [
    {
      src: 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_two@1.0/NanumSquareR.woff',
      fontWeight: 'normal'
    },
    {
      src: 'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_two@1.0/NanumSquareB.woff',
      fontWeight: 'bold'
    }
  ]
})

// A5 규격 스타일
const styles = StyleSheet.create({
  page: {
    width: '148mm',
    height: '210mm',
    padding: '15mm',
    fontFamily: 'NotoSansKR',
    fontSize: 10,
    lineHeight: 1.6,
    backgroundColor: '#ffffff'
  },
  // 표지
  coverPage: {
    width: '148mm',
    height: '210mm',
    padding: '20mm',
    fontFamily: 'NotoSansKR',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8'
  },
  coverTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center'
  },
  coverSubtitle: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center'
  },
  // 서문/마무리
  introPage: {
    width: '148mm',
    height: '210mm',
    padding: '20mm',
    fontFamily: 'NotoSansKR',
    fontSize: 10,
    lineHeight: 1.8,
    fontStyle: 'italic',
    color: '#444444'
  },
  // 챕터 제목
  chapterTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 15,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc'
  },
  // 문단
  paragraph: {
    marginBottom: 12,
    textAlign: 'justify'
  },
  // 편집자 문장 (intro/outro/editorial)
  editorialParagraph: {
    marginBottom: 12,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#e0e0e0',
    fontStyle: 'italic',
    color: '#555555'
  },
  // 페이지 번호
  pageNumber: {
    position: 'absolute',
    bottom: '10mm',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 8,
    color: '#999999'
  }
})

interface PdfParagraph {
  id: string
  content: string
  paragraph_type: ParagraphType
}

interface PdfChapter {
  order_index: number
  title: string | null
  paragraphs: PdfParagraph[]
}

interface PdfDocumentProps {
  data: {
    meta: {
      title: string
      intro: string | null
      outro: string | null
    }
    chapters: PdfChapter[]
  }
}

export default function PdfDocument({ data }: PdfDocumentProps) {
  const { meta, chapters } = data
  
  const isEditorialType = (type: ParagraphType) => {
    return ['editorial', 'intro', 'outro'].includes(type)
  }
  
  return (
    <Document>
      {/* 표지 */}
      <Page size="A5" style={styles.coverPage}>
        <Text style={styles.coverTitle}>{meta.title}</Text>
        <Text style={styles.coverSubtitle}>DOTTING</Text>
      </Page>
      
      {/* 서문 */}
      {meta.intro && (
        <Page size="A5" style={styles.introPage}>
          <Text>{meta.intro}</Text>
        </Page>
      )}
      
      {/* 챕터들 */}
      {chapters.map((chapter, chapterIndex) => (
        <Page key={chapter.order_index} size="A5" style={styles.page} wrap>
          {/* 챕터 제목 */}
          <Text style={styles.chapterTitle}>
            {chapter.title || `${chapterIndex + 1}장`}
          </Text>
          
          {/* 문단들 */}
          {chapter.paragraphs.map((para) => (
            <Text
              key={para.id}
              style={isEditorialType(para.paragraph_type) 
                ? styles.editorialParagraph 
                : styles.paragraph
              }
            >
              {para.content}
            </Text>
          ))}
          
          {/* 페이지 번호 */}
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
            fixed
          />
        </Page>
      ))}
      
      {/* 마무리 */}
      {meta.outro && (
        <Page size="A5" style={styles.introPage}>
          <Text>{meta.outro}</Text>
        </Page>
      )}
    </Document>
  )
}
