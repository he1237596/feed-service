import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeType = 'light' | 'dark' | 'blue'

interface ThemeState {
  theme: ThemeType
  setTheme: (theme: ThemeType) => void
  toggleTheme: () => void
}

const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      setTheme: (theme: ThemeType) => set({ theme }),
      toggleTheme: () => {
        const currentTheme = get().theme
        const themes: ThemeType[] = ['light', 'dark', 'blue']
        const currentIndex = themes.indexOf(currentTheme)
        const nextIndex = (currentIndex + 1) % themes.length
        set({ theme: themes[nextIndex] })
      }
    }),
    {
      name: 'theme-storage'
    }
  )
)

export default useThemeStore