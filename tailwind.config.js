/** Giao diện SAPP nằm ở đây, KHÔNG nằm trong màn hình: màn hình chỉ dùng class Tailwind chuẩn.
 *  Bản xem trước trong LibreChat dùng giao diện mặc định, bản đăng áp theme này. */
import animate from 'tailwindcss-animate'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}', './app/**/*.{ts,tsx}'],
  theme: {
    // Nhận diện SAPP: phẳng, vuông góc, đổ bóng gần như không dùng
    borderRadius: { none: '0', sm: '0', DEFAULT: '0', md: '0', lg: '0', xl: '8px', '2xl': '8px', '3xl': '8px', full: '9999px' },
    boxShadow: { none: 'none', sm: 'none', DEFAULT: 'none', md: 'none', lg: 'none', xl: 'none', '2xl': 'none', inner: 'none' },
    container: { center: true, padding: '1.5rem', screens: { '2xl': '1340px' } },
    extend: {
      fontFamily: { sans: ['"Be Vietnam Pro"', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'] },
      colors: {
        border: 'hsl(var(--border))', input: 'hsl(var(--input))', ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))', foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        // Bảng màu chuẩn của Tailwind được thay bằng thang màu SAPP, nên class như bg-amber-500, text-zinc-600 ra đúng màu SAPP khi đăng
        amber: { 50: '#FFF8EC', 100: '#FFEDCD', 200: '#FEDCA1', 300: '#FDC76F', 400: '#FCBA4F', 500: '#FBB03B', 600: '#F9A420', 700: '#D88A10', 800: '#8F5A06', 900: '#5E3B04' },
        zinc: { 50: '#F7F7F7', 100: '#F1F1F1', 200: '#E5E5E5', 300: '#CFCFCF', 400: '#A1A1A1', 500: '#8A8A8A', 600: '#666666', 700: '#414B5B', 800: '#404040', 900: '#2C2C2C' },
      },
    },
  },
  plugins: [animate],
}
