import { createClient } from "@supabase/supabase-js";
import {
  mockCategories,
  mockProducts,
  mockCampaigns,
  mockGallery,
} from "../lib/mock/data";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const adminSupabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  // 1. Categories
  console.log(`Seeding ${mockCategories.length} categories...`);
  for (const cat of mockCategories) {
    const { error } = await adminSupabase.from("categories").upsert(
      {
        id: cat.id,
        slug: cat.slug,
        name: cat.name,
        description: cat.description ?? null,
        display_order: cat.displayOrder,
        is_active: true,
      },
      { onConflict: "id" },
    );
    if (error) console.error(`  Category ${cat.slug} failed:`, error.message);
  }

  // 2. Products
  console.log(`Seeding ${mockProducts.length} products...`);
  for (const p of mockProducts) {
    const { error: prodErr } = await adminSupabase.from("products").upsert(
      {
        id: p.id,
        slug: p.slug,
        name: p.name,
        short_description: p.shortDescription,
        long_description: p.longDescription ?? null,
        technical_specs: p.technicalSpecs ?? null,
        category_id: p.categoryId,
        brand: p.brand ?? null,
        current_price: p.currentPrice,
        compare_at_price: p.compareAtPrice ?? null,
        stock_quantity: p.stockQuantity,
        low_stock_threshold: p.lowStockThreshold,
        badges: p.badges,
        is_active: p.isActive,
        is_featured: p.isFeatured,
        is_new_arrival: p.isNewArrival,
        created_at: p.createdAt,
      },
      { onConflict: "id" },
    );
    if (prodErr) {
      console.error(`  Product ${p.slug} failed:`, prodErr.message);
      continue;
    }
    await adminSupabase.from("product_media").delete().eq("product_id", p.id);
    if (p.media.length > 0) {
      const { error: mediaErr } = await adminSupabase.from("product_media").insert(
        p.media.map((m, i) => ({
          product_id: p.id,
          media_type: m.type,
          url: m.url,
          thumbnail_url: m.thumbnailUrl ?? null,
          alt_text: m.altText ?? null,
          display_order: i,
        })),
      );
      if (mediaErr) console.error(`  Product ${p.slug} media failed:`, mediaErr.message);
    }
  }

  // 3. Campaigns
  console.log(`Seeding ${mockCampaigns.length} campaigns...`);
  for (const c of mockCampaigns) {
    const { error } = await adminSupabase.from("campaigns").upsert(
      {
        id: c.id,
        slug: c.slug,
        title: c.title,
        description: c.description ?? null,
        banner_image_url: c.bannerImageUrl ?? null,
        rule_type: c.ruleType,
        rule_config: c.ruleConfig,
        applicable_to: c.applicableTo,
        target_ids: c.targetIds,
        start_date: c.startDate,
        end_date: c.endDate ?? null,
        is_active: c.isActive,
        display_on_homepage: c.displayOnHomepage,
        display_priority: c.displayPriority,
      },
      { onConflict: "id" },
    );
    if (error) console.error(`  Campaign ${c.slug} failed:`, error.message);
  }

  // 4. Gallery
  console.log(`Seeding ${mockGallery.length} gallery posts...`);
  for (const g of mockGallery) {
    const { error: gErr } = await adminSupabase.from("gallery_posts").upsert(
      {
        id: g.id,
        slug: g.slug,
        title: g.title,
        description: g.description ?? null,
        location: g.location ?? null,
        installation_date: g.installationDate ?? null,
        system_power_kw: g.systemPowerKw ?? null,
        is_featured: g.isFeatured,
      },
      { onConflict: "id" },
    );
    if (gErr) {
      console.error(`  Gallery ${g.slug} failed:`, gErr.message);
      continue;
    }
    await adminSupabase.from("gallery_media").delete().eq("post_id", g.id);
    if (g.media.length > 0) {
      const { error: mErr } = await adminSupabase.from("gallery_media").insert(
        g.media.map((m, i) => ({
          post_id: g.id,
          media_type: m.type,
          url: m.url,
          thumbnail_url: m.thumbnailUrl ?? null,
          display_order: i,
        })),
      );
      if (mErr) console.error(`  Gallery ${g.slug} media failed:`, mErr.message);
    }
  }

  console.log("Seed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
