import { useEffect, useState } from "react";

import "../styles/technews.css";
import ArticleCard from "../components/technews/ArticleCard";
import CompanyLogo from "../components/technews/CompanyLogo";
import TrendingButton from "../components/technews/TrendingButton";
import { CATEGORIES, COMPANIES, fetchCategory, fetchCompanyNews, TechNewsError } from "../lib/technews";

function TechNews() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companiesExpanded, setCompaniesExpanded] = useState(false);

  const [feed, setFeed] = useState({ status: "loading", articles: [], error: null });
  const [companyFeed, setCompanyFeed] = useState({ status: "idle", articles: [], error: null });

  // A stable "all tech" baseline, fetched once, purely to power the
  // trending button — so trending doesn't disappear just because the
  // person filtered the main feed down to one category.
  const [baseline, setBaseline] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetchCategory("all")
      .then((articles) => !cancelled && setBaseline(articles))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedCompany) return;
    let cancelled = false;
    setFeed({ status: "loading", articles: [], error: null });

    fetchCategory(activeSearch ? "all" : activeCategory, { customQuery: activeSearch })
      .then((articles) => {
        if (!cancelled) setFeed({ status: "ready", articles, error: null });
      })
      .catch((err) => {
        if (!cancelled) setFeed({ status: "error", articles: [], error: err });
      });

    return () => {
      cancelled = true;
    };
  }, [activeCategory, activeSearch, selectedCompany]);

  useEffect(() => {
    if (!selectedCompany) return;
    let cancelled = false;
    setCompanyFeed({ status: "loading", articles: [], error: null });

    fetchCompanyNews(selectedCompany.id)
      .then((articles) => {
        if (!cancelled) setCompanyFeed({ status: "ready", articles, error: null });
      })
      .catch((err) => {
        if (!cancelled) setCompanyFeed({ status: "error", articles: [], error: err });
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCompany]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    setSelectedCompany(null);
    setActiveSearch(searchInput.trim());
  }

  function handleCategoryClick(id) {
    setSelectedCompany(null);
    setSearchInput("");
    setActiveSearch("");
    setActiveCategory(id);
  }

  function handleCompanyClick(company) {
    setSelectedCompany(company);
  }

  const visibleCompanies = companiesExpanded ? COMPANIES : COMPANIES.slice(0, 10);

  const active = selectedCompany ? companyFeed : feed;
  const topNews = active.articles.slice(0, 4);
  const latestNews = active.articles.slice(4, 12);

  return (
    <main className="tn-page">
      {/* ---------------- HERO ---------------- */}
      <section className="tn-hero">
        <span className="tn-eyebrow">TECH NEWS</span>
        <h1>
          Stay Updated with the World of <span className="tn-accent">Technology</span>
        </h1>
        <p className="tn-hero-desc">
          Latest news from global and Indian markets — AI, startups, tech companies, and more.
        </p>

        <form className="tn-search" onSubmit={handleSearchSubmit}>
          <svg className="tn-search-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M20 20L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search companies, topics or keywords..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>

        <div className="tn-filters">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              className={`tn-filter-chip ${!activeSearch && !selectedCompany && activeCategory === c.id ? "tn-filter-active" : ""}`}
              onClick={() => handleCategoryClick(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </section>

      {/* ---------------- COMPANIES ---------------- */}
      <section className="tn-section">
        <div className="tn-section-heading">
          <h2>Browse by Companies</h2>
          <button className="tn-viewall-link" onClick={() => setCompaniesExpanded((v) => !v)}>
            {companiesExpanded ? "Show less" : "View All"} →
          </button>
        </div>

        <div className={`tn-company-grid ${companiesExpanded ? "tn-company-grid-wrap" : ""}`}>
          {visibleCompanies.map((company) => (
            <button
              key={company.id}
              className={`tn-company-card ${selectedCompany?.id === company.id ? "tn-company-active" : ""}`}
              onClick={() => handleCompanyClick(company)}
            >
              <CompanyLogo company={company} />
              <span>{company.name}</span>
            </button>
          ))}
        </div>
      </section>

      {selectedCompany && (
        <div className="tn-active-filter-banner">
          Showing news for <strong>{selectedCompany.name}</strong>
          <button onClick={() => setSelectedCompany(null)}>Clear ✕</button>
        </div>
      )}
      {activeSearch && !selectedCompany && (
        <div className="tn-active-filter-banner">
          Results for <strong>“{activeSearch}”</strong>
          <button
            onClick={() => {
              setActiveSearch("");
              setSearchInput("");
            }}
          >
            Clear ✕
          </button>
        </div>
      )}

      {/* ---------------- STATUS ---------------- */}
      {active.status === "loading" && <p className="tn-status">Loading real-time headlines…</p>}
      {active.status === "error" && <TechNewsErrorNotice error={active.error} />}

      {active.status === "ready" && active.articles.length === 0 && (
        <p className="tn-status">No recent articles found for this filter.</p>
      )}

      {/* ---------------- TOP NEWS ---------------- */}
      {active.status === "ready" && topNews.length > 0 && (
        <section className="tn-section">
          <div className="tn-section-heading">
            <h2>{selectedCompany ? `Top ${selectedCompany.name} News` : "Top News"}</h2>
          </div>
          <div className="tn-top-news">
            <ArticleCard article={topNews[0]} variant="featured" />
            <div className="tn-top-news-side">
              {topNews.slice(1, 4).map((a) => (
                <ArticleCard key={a.id} article={a} variant="supporting" />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------------- LATEST NEWS ---------------- */}
      {active.status === "ready" && latestNews.length > 0 && (
        <section className="tn-section">
          <div className="tn-section-heading">
            <h2>Latest News</h2>
          </div>
          <div className="tn-latest-grid">
            {latestNews.map((a) => (
              <ArticleCard key={a.id} article={a} variant="list" />
            ))}
          </div>
        </section>
      )}

      <TrendingButton articles={baseline} />
    </main>
  );
}

function TechNewsErrorNotice({ error }) {
  const isConfig = error instanceof TechNewsError && error.configMissing;
  return (
    <div className="tn-status tn-status-error">
      {isConfig ? (
        <>
          TechNews isn't connected to a live news source yet. Add your GNews API key as <code>GNEWS_API_KEY</code> in <code>.env.local</code>, then restart the dev server.
        </>
      ) : (
        error?.message || "Couldn't load news right now. Please try again shortly."
      )}
    </div>
  );
}

export default TechNews;
