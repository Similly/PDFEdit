# PDF Edit

![PDF Edit](public/favicon.svg)

**PDF Edit** is a lightweight, client-side PDF editor that allows you to edit, sign, merge, and fill PDF forms entirely in your browser.

With 100% client-side processing, there are no file uploads, no remote servers, and your data remains completely private.

## Features

- **Edit PDFs**: Add text, shapes, and interact with PDF documents.
- **Sign PDFs**: Draw and place signatures seamlessly.
- **Merge PDFs**: Combine multiple PDF files into one easily.
- **Form Filling**: Fill PDF forms directly.
- **Privacy First**: All processing is done locally in your browser using modern Web APIs.

## Technologies Used

Built with a modern web stack:
- **Vanilla JavaScript**: ES modules for a lightweight footprint without heavy frameworks.
- **Vite**: Next-generation frontend tooling for fast development and optimized builds.
- **pdf-lib**: For robust client-side PDF generation and manipulation.
- **pdfjs-dist**: For high-quality rendering of PDF documents.

## Getting Started

### Prerequisites

You need [Node.js](https://nodejs.org/) installed on your machine.

### Installation

Clone the repository and install the dependencies:

```bash
npm install
```

### Development Server

To start the Vite development server (with hot module replacement):

```bash
npm run dev
```

### Production Build

To build the application for production:

```bash
npm run build
```

This will generate an optimized build in the `dist` folder. To preview the production build locally:

```bash
npm run preview
```

## Deployment
Since this application operates 100% client-side, you can deploy the contents of the `dist` folder to any static hosting provider such as GitHub Pages, Vercel, Netlify, or standard NGINX servers. A `Dockerfile` and `docker-compose.yml` are also provided for containerized deployment.
