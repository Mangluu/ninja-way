import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' keeps asset paths relative so it works whether it's deployed at
// mangluu.github.io/ (user site) or mangluu.github.io/shivang/ (project page).
export default defineConfig({
  plugins: [react()],
  base: './',
})
