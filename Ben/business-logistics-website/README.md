# Business Development & Logistics Website

A modern, responsive website for a company specializing in business development and logistics solutions. Built with Next.js, TypeScript, and Tailwind CSS.

## Features

- **Responsive Design**: Mobile-first approach with modern UI/UX
- **Performance Optimized**: Built with Next.js for fast loading and SEO
- **Business Development Services**: Business setup, revitalization, digital transformation
- **Logistics Solutions**: Freight forwarding, supply chain management, last-mile delivery
- **Modern Components**: Built with React hooks and Framer Motion animations
- **TypeScript**: Full type safety and better development experience

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Deployment**: Ready for Vercel, Netlify, or any hosting platform

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd business-logistics-website
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── about/             # About page
│   ├── services/          # Services page
│   ├── contact/           # Contact page
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # Reusable components
│   ├── layout/           # Layout components (Header, Footer)
│   ├── sections/         # Page sections (Hero, Services, About, CTA)
│   └── ui/              # UI components
└── types/                # TypeScript type definitions
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Customization

### Colors
The website uses a custom color scheme defined in `tailwind.config.ts`. The primary brand color is orange (#f97316).

### Content
Update the content in the component files to match your business:
- Company name and logo
- Service descriptions
- Contact information
- About us content

### Images
Replace the placeholder images with your own:
- Hero background image
- Company photos
- Service icons

## Deployment

The website is ready for deployment on:
- **Vercel** (recommended for Next.js)
- **Netlify**
- **AWS Amplify**
- Any static hosting platform

## Performance Features

- **Image Optimization**: Next.js automatic image optimization
- **Code Splitting**: Automatic code splitting for better performance
- **SEO Optimized**: Meta tags and structured data ready
- **Mobile Optimized**: Responsive design for all devices

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

This project is licensed under the MIT License.

## Support

For support or questions, please contact your development team.
