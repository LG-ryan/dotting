import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // 테스트 환경
    environment: 'node',
    
    // 테스트 파일 패턴
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    
    // 글로벌 설정 파일 (프로덕션 가드 포함)
    setupFiles: ['./tests/setup.ts'],
    
    // 타임아웃
    testTimeout: 10000,
    
    // 커버리지
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules', 'tests'],
    },
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
