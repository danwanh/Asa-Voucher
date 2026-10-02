<a id="readme-top"></a>

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://asa-voucher.vercel.app/">
    <img src="frontend/public/logo.png" alt="Asa Voucher Logo" width="100" height="80">
  </a>

  <h3 align="center">Asa Voucher Platform</h3>

  <p align="center">
    An e-commerce platform for buying, selling and redeeming digital vouchers.
    <br />
    <br />
    <a href="https://asa-voucher.vercel.app/">View Demo</a>

  </p>
</div>

<br />

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
  </ol>
</details>

<br />

<!-- ABOUT THE PROJECT -->
## About The Project

[![Asa Voucher][product-screenshot]](https://asa-voucher.vercel.app/)

**Asa Voucher** is an e-commerce platform for selling **digital vouchers** online. It connects customers, partner businesses and store staff in a single ecosystem for managing vouchers end to end.

🌐 **Live deployment:** [https://asa-voucher.vercel.app/](https://asa-voucher.vercel.app/)

### Key Features

* **Customers** browse and search vouchers, add them to a cart, pay (VNPay / PayPal sandbox) and receive a voucher code / QR code.

* **Partners** register their business, manage staff, create vouchers and submit them for approval, and view revenue reports.

* **Store staff** scan a QR code or enter a code to redeem vouchers at the point of sale.

* **Admins** approve partners and vouchers, manage accounts and monitor audit logs.

### User Roles

| Role | Description |
|---|---|
| `buyer` | Customer who purchases vouchers |
| `partner_owner` | Owner of a partner business |
| `partner_voucher_staff` | Partner staff who create and manage vouchers |
| `partner_store_staff` | Store staff who redeem vouchers |
| `admin_content` | Content admin who reviews vouchers |
| `admin_operations` | Operations admin who manages accounts and partners |
| `admin_security` | Security admin who manages logs and security |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

* [![Next][Next.js]][Next-url]

* [![React][React.js]][React-url]

* [![TypeScript][TypeScript]][TypeScript-url]

* [![Tailwind][TailwindCSS]][Tailwind-url]

* [![Express][Express.js]][Express-url]

* [![Prisma][Prisma]][Prisma-url]

* [![Supabase][Supabase]][Supabase-url]

* [![Vercel][Vercel]][Vercel-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>


<!-- GETTING STARTED -->
## Getting Started

Follow these steps to set up and run the project locally.


### Prerequisites

* **Node.js** >= 20 LTS

* **npm** >= 10

  ```sh
  npm install npm@latest -g
  ```

* A **Supabase** project (PostgreSQL connection string + API keys)

* (Optional) A **Cloudinary** account for image uploads, and SMTP/Resend for sending email


### Installation

1. Clone the repo

   ```sh
   git clone https://github.com/danwanh/Asa-Voucher.git
   cd Asa-Voucher
   ```

2. Install dependencies for both frontend and backend

   ```sh
   npm run install:all
   ```

3. Create the environment files from the examples and fill in real values

   ```sh
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env.local
   ```

   Frontend (`frontend/.env.local`):

   ```env
   NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

   Backend (`backend/.env`), key variables:

   ```env
   PORT=5000
   FRONTEND_URL=http://localhost:3000
   DATABASE_URL="postgresql://postgres.your-project-ref:[YOUR-PASSWORD]@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
   DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.your-project-ref.supabase.co:5432/postgres"
   JWT_SECRET=your-jwt-secret
   ```


4. Set up the database

   ```sh
   cd backend
   npm run prisma:generate
   npm run prisma:migrate:deploy
   npm run seed   # (optional) sample data
   cd ..
   ```

5. Run the backend and frontend (in two separate terminals)

   ```sh
   npm run dev:backend    # http://localhost:5000
   npm run dev:frontend   # http://localhost:3000
   ```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<br />

<!-- USAGE EXAMPLES -->
## Usage

Try the live demo at **[asa-voucher.vercel.app](https://asa-voucher.vercel.app/)**, or open http://localhost:3000 when running locally.


### Main Business Flow

```
1. A partner registers a business account
2. An admin approves the partner
3. Partner staff create vouchers
4. A content admin reviews and approves the vouchers
5. Vouchers are published for sale
6. Customers search, add vouchers to the cart and check out
7. The system processes the payment (VNPay / PayPal sandbox)
8. The system issues a voucher code / QR code
9. Store staff redeem the voucher
10. The system aggregates reports and audit logs
```


### Useful Commands

Run from the repo root:

| Command | Description |
|---|---|
| `npm run build` | Build frontend and backend |
| `npm run lint` | Lint all workspaces |
| `npm run type-check` | Run TypeScript type checks |
| `npm test` | Run backend tests (Vitest) |


### Project Structure

```
Asa-Voucher/
├── frontend/          # Next.js App Router (React + TypeScript)
├── backend/           # Express.js REST API + Prisma
├── docs/              # Project documentation
├── package.json       # Root monorepo scripts (npm workspaces)
└── README.md
```


<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- MARKDOWN LINKS & IMAGES -->
[product-screenshot]: img/home.png
[Next.js]: https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white
[Next-url]: https://nextjs.org/
[React.js]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://reactjs.org/
[TypeScript]: https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white
[TypeScript-url]: https://www.typescriptlang.org/
[TailwindCSS]: https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white
[Tailwind-url]: https://tailwindcss.com/
[Express.js]: https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white
[Express-url]: https://expressjs.com/
[Prisma]: https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white
[Prisma-url]: https://www.prisma.io/
[Supabase]: https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white
[Supabase-url]: https://supabase.com/
[Vercel]: https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white
[Vercel-url]: https://vercel.com/
