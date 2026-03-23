import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(defineConfig({
  srcDir: 'docs',
  base: '/wiki/',
  title: "IntraClinica Wiki",
  description: "Official Documentation for IntraClinica (Angular 18 / Supabase)",
  appearance: 'dark',
  ignoreDeadLinks: false,
  themeConfig: {
    logo: 'https://angular.dev/assets/images/logos/angular/angular.svg',
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Onboarding', link: '/onboarding/principal-guide' },
      { text: 'Architecture', link: '/core-architecture/multi-tenant-security' }
    ],
    sidebar: [
      {
        text: 'Onboarding',
        items: [
          { text: 'Principal-Level Guide', link: '/onboarding/principal-guide' },
          { text: 'Zero-to-Hero Guide', link: '/onboarding/zero-to-hero' }
        ]
      },
      {
        text: 'Core Architecture',
        items: [
          { text: 'Multi-Tenant Security', link: '/core-architecture/multi-tenant-security' },
          { text: 'Database Schema', link: '/core-architecture/database' },
          { text: 'AI Integrations', link: '/core-architecture/ai-integrations' }
        ]
      },
      {
        text: 'Feature Modules',
        items: [
          { text: 'Reception', link: '/feature-modules/reception' },
          { text: 'Clinical', link: '/feature-modules/clinical' },
          { text: 'Inventory', link: '/feature-modules/inventory' }
        ]
      },
      {
        text: 'Getting Started',
        items: [
          { text: 'Local Development', link: '/getting-started/local-development' },
          { text: 'Testing Workflow', link: '/getting-started/testing-workflow' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/bbanho/intraclinica-supabase' }
    ]
  },
  mermaid: {
    theme: 'dark',
    themeVariables: {
      primaryColor: '#1e3a5f',
      primaryTextColor: '#e0e0e0',
      primaryBorderColor: '#4a9eed',
      lineColor: '#4a9eed',
      secondaryColor: '#2d4a3e',
      tertiaryColor: '#2d2d3d',
      background: '#1a1a2e',
      mainBkg: '#1e3a5f',
      nodeBorder: '#4a9eed',
      clusterBkg: '#16213e',
      titleColor: '#e0e0e0',
      edgeLabelBackground: '#1a1a2e'
    }
  }
}))
