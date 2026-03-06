const features = [
  {
    title: "Desain modern",
    description:
      "Tampilan bersih, responsive, dan enak dilihat di desktop maupun mobile.",
  },
  {
    title: "Performa cepat",
    description:
      "Struktur ringan agar website tetap cepat dibuka dan nyaman dipakai.",
  },
  {
    title: "Mudah dikembangkan",
    description:
      "Fondasi komponen yang rapi supaya mudah ditambah fitur kapan saja.",
  },
];

const services = [
  "Company profile",
  "Landing page produk",
  "Website UMKM",
  "Dashboard internal",
];

const pricing = [
  {
    name: "Starter",
    price: "Rp1.500.000",
    detail: "Cocok untuk profil bisnis sederhana.",
    items: ["1 halaman utama", "Desain responsive", "Revisi minor 2x"],
  },
  {
    name: "Growth",
    price: "Rp3.500.000",
    detail: "Untuk brand yang butuh presentasi lebih kuat.",
    items: ["Hingga 5 halaman", "SEO dasar", "Form kontak", "Revisi 4x"],
  },
  {
    name: "Pro",
    price: "Custom",
    detail: "Untuk kebutuhan khusus dan fitur lanjutan.",
    items: ["Desain + fitur sesuai brief", "Integrasi API", "Support prioritas"],
  },
];

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <a href="#" className="text-lg font-bold">
            WebKita
          </a>
          <nav className="hidden gap-6 text-sm text-muted-foreground md:flex">
            <a href="#fitur" className="hover:text-foreground">
              Fitur
            </a>
            <a href="#layanan" className="hover:text-foreground">
              Layanan
            </a>
            <a href="#harga" className="hover:text-foreground">
              Harga
            </a>
            <a href="#kontak" className="hover:text-foreground">
              Kontak
            </a>
          </nav>
          <a
            href="#kontak"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Mulai Sekarang
          </a>
        </div>
      </header>

      <main>
        <section className="border-b border-border/70">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-20 sm:px-6 md:grid-cols-2 md:py-28">
            <div>
              <p className="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                Jasa pembuatan website
              </p>
              <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
                Bisa banget, saya bantu bikin web kamu dari nol sampai jadi.
              </h1>
              <p className="mt-5 max-w-xl text-muted-foreground">
                Tinggal kirim konsep, referensi desain, atau kebutuhan bisnis.
                Nanti saya susun halaman yang modern, cepat, dan siap dipakai.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#kontak"
                  className="rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
                >
                  Diskusi Kebutuhan
                </a>
                <a
                  href="#harga"
                  className="rounded-md border border-border px-5 py-3 text-sm font-semibold hover:bg-muted"
                >
                  Lihat Paket
                </a>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-sm font-medium text-muted-foreground">
                Ringkasan hasil yang kamu dapat:
              </p>
              <ul className="mt-4 space-y-3 text-sm">
                <li className="rounded-lg bg-muted px-3 py-2">
                  Struktur halaman jelas dan profesional
                </li>
                <li className="rounded-lg bg-muted px-3 py-2">
                  Tampilan mobile friendly dan responsive
                </li>
                <li className="rounded-lg bg-muted px-3 py-2">
                  Siap lanjut ke SEO, ads, atau integrasi sistem
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section id="fitur" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-bold sm:text-3xl">Kenapa pilih web ini?</h2>
          <p className="mt-2 text-muted-foreground">
            Fokus ke hasil: tampilan bagus, performa cepat, dan mudah dipelihara.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-xl border border-border bg-card p-5"
              >
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section id="layanan" className="border-y border-border/70 bg-muted/40">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-2xl font-bold sm:text-3xl">Layanan yang tersedia</h2>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {services.map((service) => (
                <div
                  key={service}
                  className="rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium"
                >
                  {service}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="harga" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-bold sm:text-3xl">Pilihan paket</h2>
          <p className="mt-2 text-muted-foreground">
            Bisa pilih paket yang paling pas dengan targetmu.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {pricing.map((plan) => (
              <article
                key={plan.name}
                className="rounded-xl border border-border bg-card p-5"
              >
                <p className="text-sm text-muted-foreground">{plan.name}</p>
                <p className="mt-2 text-2xl font-extrabold">{plan.price}</p>
                <p className="mt-2 text-sm text-muted-foreground">{plan.detail}</p>
                <ul className="mt-4 space-y-2 text-sm">
                  {plan.items.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-border/70 bg-muted/40">
          <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
            <h2 className="text-2xl font-bold sm:text-3xl">FAQ singkat</h2>
            <div className="mt-6 space-y-3">
              <details className="rounded-lg border border-border bg-card p-4">
                <summary className="cursor-pointer font-medium">
                  Berapa lama pengerjaan website?
                </summary>
                <p className="mt-2 text-sm text-muted-foreground">
                  Umumnya 3-10 hari kerja tergantung jumlah halaman dan kompleksitas
                  fitur.
                </p>
              </details>
              <details className="rounded-lg border border-border bg-card p-4">
                <summary className="cursor-pointer font-medium">
                  Bisa minta revisi desain?
                </summary>
                <p className="mt-2 text-sm text-muted-foreground">
                  Bisa. Jumlah revisi mengikuti paket, dan revisi tambahan tetap
                  bisa didiskusikan.
                </p>
              </details>
              <details className="rounded-lg border border-border bg-card p-4">
                <summary className="cursor-pointer font-medium">
                  Bisa lanjut maintenance?
                </summary>
                <p className="mt-2 text-sm text-muted-foreground">
                  Bisa. Website dapat dilanjutkan ke maintenance, update konten,
                  dan pengembangan fitur baru.
                </p>
              </details>
            </div>
          </div>
        </section>

        <section id="kontak" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">Siap mulai proyek web?</h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Kirim kebutuhan kamu (jenis bisnis, contoh referensi, target halaman),
              nanti saya bantu susun websitenya sampai online.
            </p>
            <a
              href="mailto:halo@webkita.dev"
              className="mt-6 inline-block rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
            >
              Hubungi: halo@webkita.dev
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/70 py-6 text-center text-sm text-muted-foreground">
        (c) {new Date().getFullYear()} WebKita. All rights reserved.
      </footer>
    </div>
  );
}
