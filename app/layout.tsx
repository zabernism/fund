import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '基金行情看板',
  description: '实时查看自选基金涨跌、大盘行情、板块热力图与贵金属行情的行情终端',
};

const themeScript = `(function(){try{var t=localStorage.getItem('fund-dashboard:theme');if(t!=='light'&&t!=='dark'&&t!=='system'&&t!=='eye'){t='system';}document.documentElement.setAttribute('data-theme',t);var dark=(t==='dark')||(t==='system'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.style.colorScheme=dark?'dark':(t==='light'?'light':'normal');}catch(e){document.documentElement.setAttribute('data-theme','system');}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Hanken+Grotesk:wght@600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=block"
          rel="stylesheet"
        />
        {children}
      </body>
    </html>
  );
}
