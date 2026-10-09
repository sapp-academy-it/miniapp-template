// Lint cho mã của app (app/**). Quy tắc an toàn: không gọi mạng trực tiếp, không chèn HTML, không lưu dữ liệu trong trình duyệt,
// chỉ import từ thư viện đã cài và từ "/components/ui/<tên>", "/lib/utils".
import tseslint from 'typescript-eslint'
import importPlugin from 'eslint-plugin-import'

const syntax = (selector, message) => ({ selector, message })

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  {
    files: ['app/**/*.{ts,tsx}'],
    extends: [tseslint.configs.base],
    plugins: { import: importPlugin },
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    rules: {
      'import/no-extraneous-dependencies': ['error', { devDependencies: false, optionalDependencies: false }],
      'no-restricted-imports': ['error', { patterns: [
        { regex: '^\\.', message: 'Mỗi màn hình phải tự chứa, không import file khác.' },
        { regex: '^@/', message: 'Chỉ dùng "/components/ui/<tên>" và "/lib/utils".' },
        { regex: '^/(?!components/ui/[^/]+$|lib/utils$)', message: 'Chỉ dùng "/components/ui/<tên>" và "/lib/utils".' },
      ] }],
      'no-restricted-globals': ['error',
        ...['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource'].map((name) => ({ name, message: 'Gọi dữ liệu qua props ops, không gọi mạng trực tiếp.' })),
        ...['localStorage', 'sessionStorage', 'indexedDB'].map((name) => ({ name, message: 'Không lưu dữ liệu trong trình duyệt (token chỉ nằm trong bộ nhớ).' })),
        { name: 'require', message: 'Không dùng require.' },
      ],
      'no-restricted-properties': ['error',
        { object: 'document', property: 'cookie', message: 'Không dùng cookie.' },
        { object: 'document', property: 'write', message: 'Không dùng document.write.' },
        { object: 'navigator', property: 'sendBeacon', message: 'Không gửi dữ liệu ra ngoài.' },
        { property: 'innerHTML', message: 'Dữ liệu chỉ được render qua JSX.' },
        { property: 'outerHTML', message: 'Dữ liệu chỉ được render qua JSX.' },
        { property: 'insertAdjacentHTML', message: 'Dữ liệu chỉ được render qua JSX.' },
      ],
      'no-restricted-syntax': ['error',
        syntax("JSXAttribute[name.name='dangerouslySetInnerHTML']", 'Không dùng dangerouslySetInnerHTML.'),
        syntax("JSXOpeningElement[name.name=/^(script|iframe|object|embed)$/]", 'Không dùng thẻ script, iframe, object, embed.'),
        syntax('ImportExpression', 'Không dùng import() động.'),
      ],
      'no-eval': 'error',
      'no-new-func': 'error',
      'no-implied-eval': 'error',
      'no-warning-comments': ['error', { terms: ['todo', 'fixme', 'preview-only'], location: 'anywhere' }],
    },
  },
)
