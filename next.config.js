/** @type {import('next').NextConfig} */
const nextConfig = {
  // Recharts 2.x ResponsiveContainer가 React 18 strict mode의 이중 렌더에서
  // 측정에 실패해 차트가 빈 채로 남는 이슈가 있어 비활성화한다.
  reactStrictMode: false,
};

module.exports = nextConfig;
