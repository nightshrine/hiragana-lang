import {defineConfig} from 'vite'

// GitHub Pages のプロジェクトページ配下でも動くように相対パスで出力する
export default defineConfig({
    base: './',
})
