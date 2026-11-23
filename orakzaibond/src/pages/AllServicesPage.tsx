import { ArrowLeft, ArrowRight, ChevronDown, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useSEO } from "@/components/SEO";
import { HUB_COUNTRIES, categoriesForMarket, catalogSlug } from "@/data/serviceCatalog";
import "./ServicesMarketplace.css";

export default function AllServicesPage() {
  const initialCode = typeof window !== "undefined" ? window.localStorage.getItem("okbond-service-country") ?? "PK" : "PK";
  const [countryCode, setCountryCode] = useState(initialCode);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const country = HUB_COUNTRIES.find((item) => item.code === countryCode) ?? HUB_COUNTRIES[0];
  const categories = categoriesForMarket(country.code);
  const totalServices = categories.reduce((total, category) => total + category.services.length, 0);
  const normalizedQuery = query.trim().toLowerCase();

  const filteredCategories = useMemo(() => categories.map((category) => ({
    ...category,
    services: category.services.filter((service) => `${category.label} ${service}`.toLowerCase().includes(normalizedQuery)),
  })).filter((category) => (activeCategory === "all" || category.id === activeCategory) && (category.services.length > 0 || category.label.toLowerCase().includes(normalizedQuery))), [activeCategory, categories, normalizedQuery]);

  useSEO({
    title: "All Services | OKBOND",
    description: `Browse all OKBOND service categories and services available for ${country.name}.`,
    canonical: "https://orakzaibond.com/services/all",
  });

  const chooseCountry = (code: string) => {
    setCountryCode(code);
    try { window.localStorage.setItem("okbond-service-country", code); } catch { /* storage may be unavailable */ }
  };

  return (
    <main className="all-services-page">
      <div className="all-services-page__ambient" aria-hidden="true" />
      <div className="all-services-page__shell">
        <header className="all-services-page__header">
          <Link href="/services" className="all-services-page__back"><ArrowLeft size={16} /> <span>Services</span></Link>
          <div className="all-services-page__brand"><span className="all-services-page__brand-dot" /> OKBOND <small>DIRECTORY</small></div>
          <span className="all-services-page__status"><span /> LIVE</span>
        </header>

        <section className="all-services-page__hero" aria-labelledby="all-services-title">
          <div>
            <p className="all-services-page__eyebrow"><Sparkles size={13} /> OKBOND SERVICE NETWORK</p>
            <h1 id="all-services-title">All Services</h1>
            <p className="all-services-page__subtitle">Every category. Every service pathway.</p>
          </div>
          <div className="all-services-page__hero-metric"><strong>{String(totalServices).padStart(2, "0")}</strong><span>available pathways<br />in {country.name}</span></div>
        </section>

        <section className="all-services-page__controls" aria-label="Service filters">
          <label className="all-services-page__search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search services or categories" aria-label="Search all services" /><kbd>/</kbd></label>
          <label className="all-services-page__country"><span>{country.flag}</span><select value={country.code} onChange={(event) => chooseCountry(event.target.value)} aria-label="Select country">{HUB_COUNTRIES.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select><ChevronDown size={15} /></label>
        </section>

        <div className="all-services-page__summary"><p><span className="all-services-page__pulse" /> {country.name} <b>·</b> {totalServices} service pathways</p><span className="all-services-page__filter-label"><SlidersHorizontal size={13} /> Filter by category</span></div>
        <nav className="all-services-page__tabs" aria-label="Filter by category">
          <button type="button" className={activeCategory === "all" ? "is-active" : ""} onClick={() => setActiveCategory("all")}>All services <span>{totalServices}</span></button>
          {categories.map((category) => <button type="button" key={category.id} className={activeCategory === category.id ? "is-active" : ""} onClick={() => setActiveCategory(category.id)}>{category.label} <span>{category.services.length}</span></button>)}
        </nav>

        <section className="all-services-page__categories" aria-label="All service categories">
          {filteredCategories.map(({ id, label, detail, icon: Icon, services }) => <article key={id} className="all-services-category">
            <div className="all-services-category__heading"><span className="all-services-category__icon"><Icon size={19} strokeWidth={1.8} /></span><div><p>{id === "featured" ? "CORE SERVICES" : "SERVICE CATEGORY"}</p><h2>{label}</h2><span>{detail}</span></div><div className="all-services-category__count"><strong>{services.length}</strong><small>services</small></div><Link href={`/services/catalog/${id}`} aria-label={`Open ${label} category`}><ArrowRight size={17} /></Link></div>
            <div className="all-services-category__grid">{services.map((service, index) => <Link key={service} href={`/services/catalog/${catalogSlug(service)}`} className="all-services-item"><span className="all-services-item__number">{String(index + 1).padStart(2, "0")}</span><span className="all-services-item__icon"><Icon size={15} strokeWidth={1.8} /></span><span className="all-services-item__name">{service}</span><ArrowRight className="all-services-item__arrow" size={14} /></Link>)}</div>
          </article>)}
        </section>
        {filteredCategories.length === 0 && <div className="all-services-page__empty"><Search size={23} /><p>No service matched “{query}” in {country.name}.</p><button type="button" onClick={() => { setQuery(""); setActiveCategory("all"); }}>Clear filters</button></div>}
      </div>
    </main>
  );
}
