"use client";

import { useEffect, useState } from "react";
import { FileText, Plus, ExternalLink, X } from "lucide-react";

interface AppLink {
  id: string;
  title: string;
  url: string;
  description?: string;
  category?: string;
}

export default function ApplicationsPage() {
  const [links, setLinks] = useState<AppLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchLinks = () => {
    setLoading(true);
    fetch("/api/applications")
      .then((r) => r.json())
      .then(setLinks)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        url: form.get("url"),
        description: form.get("description"),
        category: form.get("category"),
      }),
    });
    setShowForm(false);
    fetchLinks();
  };

  const handleDelete = async (id: string) => {
    await fetch("/api/applications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchLinks();
  };

  const categories = [...new Set(links.map((l) => l.category).filter(Boolean))];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
            Applications
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Quick access to your application links and resources
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white cursor-pointer"
          style={{ background: "#5B8C2A" }}
        >
          <Plus size={16} />
          Add Link
        </button>
      </div>

      {/* Add Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl p-6 border" style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Add Application Link</h2>
              <button onClick={() => setShowForm(false)} className="cursor-pointer" style={{ color: "var(--text-muted)" }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Title</label>
                <input name="title" required className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>URL</label>
                <input name="url" type="url" required className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Description</label>
                <input name="description" className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Category</label>
                <input name="category" placeholder="e.g. Forms, Booking, Funding" className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
              </div>
              <button type="submit" className="w-full py-2.5 rounded-lg text-sm font-medium text-white cursor-pointer" style={{ background: "#5B8C2A" }}>
                Add Link
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Links Grid */}
      {loading ? (
        <div className="text-sm animate-pulse" style={{ color: "var(--text-muted)" }}>Loading...</div>
      ) : links.length === 0 ? (
        <div className="rounded-xl p-12 text-center border" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
          <FileText size={32} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No application links yet. Add your JotForms, booking links, and other resources.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.length > 0 ? (
            categories.map((cat) => (
              <div key={cat}>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
                  {cat}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {links.filter((l) => l.category === cat).map((link) => (
                    <div
                      key={link.id}
                      className="rounded-xl p-4 border group transition-colors"
                      style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium hover:underline inline-flex items-center gap-1.5"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {link.title}
                            <ExternalLink size={12} style={{ color: "var(--text-muted)" }} />
                          </a>
                          {link.description && (
                            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                              {link.description}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDelete(link.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ml-2"
                          style={{ color: "var(--text-muted)" }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="rounded-xl p-4 border group transition-colors"
                  style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium hover:underline inline-flex items-center gap-1.5"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {link.title}
                        <ExternalLink size={12} style={{ color: "var(--text-muted)" }} />
                      </a>
                      {link.description && (
                        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                          {link.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(link.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ml-2"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
