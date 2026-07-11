const roles = [
  "Khach hang",
  "Nhan vien quan ly doi tac",
  "Nhan vien cua hang",
  "Admin noi dung",
  "Admin tai khoan",
  "Admin log va bao mat"
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-16">
      <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">Asa Voucher</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 md:text-6xl">
          Nen tang thuong mai dien tu voucher dien tu
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
          Scaffold ban dau cho frontend Next.js App Router. Cac nghiep vu bao ve nhu thanh toan mo phong, phat hanh voucher va xac thuc voucher se di qua backend Express.js.
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {roles.map((role) => (
          <div key={role} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700">
            {role}
          </div>
        ))}
      </section>
    </main>
  );
}
