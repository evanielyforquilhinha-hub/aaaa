/** 文章主题色方案 */
export const articleThemes = [
  { id: "default", name: "默认", bgColor: "#F5F5F7", textColor: "#1D1D1F", accentColor: "#34C759" },
  { id: "warm", name: "暖色", bgColor: "#FFF8F0", textColor: "#3D2C1E", accentColor: "#FF9500" },
  { id: "cool", name: "冷色", bgColor: "#F0F4FF", textColor: "#1E2A3D", accentColor: "#4A90D9" },
]
export function getTheme(id: string) {
  return articleThemes.find(t => t.id === id) || articleThemes[0]
}
