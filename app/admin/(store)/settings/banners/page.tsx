"use client";

import { useEffect, useMemo, useState } from "react";
import { Image } from "lucide-react";

import AdminBackButton from "@/components/admin/ui/AdminBackButton";
import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import BannerCreateForm from "@/components/admin/banners/BannerCreateForm";
import BannerList from "@/components/admin/banners/BannerList";

import {
  getAdminBannersByStoreId,
  createBannerForStore,
  updateBanner,
  deleteBanner,
  getAdminActiveCategories,
} from "@/lib/services/settings";

import type { Banner, Category } from "@/components/admin/settings/types";
import { getBannerTargetLink } from "@/components/admin/banners/bannerHelpers";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";

type BannerForm = {
  title: string;
  subtitle: string;
  image_url: string;
  product_image_url: string;
  badge_text: string;
  button_text: string;
  button_link: string;
  category_id: string;
  sort_order: string;
  is_active: boolean;
  layout_type: "image" | "template";
  background_color: string;
  text_color: string;
  accent_color: string;
};

const initialForm: BannerForm = {
  title: "",
  subtitle: "",
  image_url: "",
  product_image_url: "",
  badge_text: "",
  button_text: "Ver productos",
  button_link: "/tienda",
  category_id: "",
  sort_order: "0",
  is_active: true,
  layout_type: "image",
  background_color: "#061b3a",
  text_color: "#ffffff",
  accent_color: "#ef4444",
};

export default function AdminBannersSettingsPage() {
  const { loading: accessLoading, isSuperAdmin, store: accessStore } = useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();

  const activeStore = useMemo(() => {
    if (isSuperAdmin) return selectedStore || accessStore;
    return accessStore;
  }, [accessStore, isSuperAdmin, selectedStore]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<BannerForm>(initialForm);

  const sortedBanners = useMemo(() => {
    return [...banners].sort(
      (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
    );
  }, [banners]);

  const activeBannersCount = useMemo(() => {
    return banners.filter((banner) => banner.is_active).length;
  }, [banners]);

  const loadData = async () => {
    if (accessLoading || storeLoading) return;

    if (!activeStore?.id) {
      setBanners([]);
      setCategories([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const [{ data: bannersData }, { data: categoriesData }] =
      await Promise.all([
        getAdminBannersByStoreId(activeStore.id),
        getAdminActiveCategories(activeStore.id),
      ]);

    setBanners(bannersData || []);
    setCategories(categoriesData || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessLoading, storeLoading, activeStore?.id]);

  const handleCreate = async () => {
    if (!form.title.trim()) return;

    setSaving(true);

    if (!activeStore?.id) return;

    await createBannerForStore(activeStore.id, {
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      image_url: form.image_url,
      product_image_url: form.product_image_url,
      badge_text: form.badge_text,
      button_text: form.button_text.trim(),
      button_link: form.button_link,
      category_id: form.category_id || null,
      sort_order: Number(form.sort_order || banners.length + 1),
      layout_type: form.layout_type,
      background_color: form.background_color,
      text_color: form.text_color,
      accent_color: form.accent_color,
      is_active: form.is_active,
    });

    setForm({
      ...initialForm,
      sort_order: String(banners.length + 2),
    });

    await loadData();
    setSaving(false);
  };

  const handleUpdate = async (
    id: string,
    field: keyof Banner,
    value: string | number | boolean | null
  ) => {
    await updateBanner(id, {
      [field]: value,
    });

    setBanners((prev) =>
      prev.map((banner) =>
        banner.id === id ? { ...banner, [field]: value } : banner
      )
    );
  };

  const handleReorder = async (reorderedBanners: Banner[]) => {
    const updatedBanners = reorderedBanners.map((banner, index) => ({
      ...banner,
      sort_order: index + 1,
    }));

    setBanners(updatedBanners);

    await Promise.all(
      updatedBanners.map((banner) =>
        updateBanner(banner.id, {
          sort_order: banner.sort_order,
        })
      )
    );
  };

  const handleDelete = async (id: string) => {
    const ok = confirm("¿Seguro que deseas eliminar este banner?");
    if (!ok) return;

    await deleteBanner(id);
    await loadData();
  };

  const handleFormChange = (field: string, value: string | boolean) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNewCategoryChange = (categoryId: string) => {
    setForm((prev) => ({
      ...prev,
      category_id: categoryId,
      button_link: getBannerTargetLink(categories, categoryId),
    }));
  };

  const handleExistingCategoryChange = async (
    bannerId: string,
    categoryId: string
  ) => {
    const buttonLink = getBannerTargetLink(categories, categoryId);

    await updateBanner(bannerId, {
      category_id: categoryId || null,
      button_link: buttonLink,
    });

    setBanners((prev) =>
      prev.map((banner) =>
        banner.id === bannerId
          ? {
              ...banner,
              category_id: categoryId || null,
              button_link: buttonLink,
            }
          : banner
      )
    );
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-4 pb-24 md:p-6">
      <div className="mx-auto max-w-6xl">
        <AdminBackButton />

        <AdminPageHeader
          title="Banners"
          description="Administra toda la publicidad visual de la tienda."
          badge="Promociones"
          icon={Image}
        />

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Banners creados
            </p>
            <p className="mt-1 text-3xl font-black text-[#061b3a]">
              {banners.length}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Banners activos
            </p>
            <p className="mt-1 text-3xl font-black text-green-600">
              {activeBannersCount}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Categorías disponibles
            </p>
            <p className="mt-1 text-3xl font-black text-blue-600">
              {categories.length}
            </p>
          </div>
        </section>

        <BannerCreateForm
          form={form}
          categories={categories}
          onChange={handleFormChange}
          onCategoryChange={handleNewCategoryChange}
          onCreate={handleCreate}
          saving={saving}
        />

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <h2 className="mb-5 text-xl font-black text-[#0B1F4D]">
            Banners existentes
          </h2>

          {!loading && (
            <BannerList
              banners={sortedBanners}
              categories={categories}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onCategoryChange={handleExistingCategoryChange}
              onReorder={handleReorder}
            />
          )}
        </section>
      </div>
    </main>
  );
}