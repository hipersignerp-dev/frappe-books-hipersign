import { call } from 'src/web/api';

/** What the site's `variant_stock` API returns for an item's product. */
type VariantStockResponse = {
  item: string | null;
  product: string | null;
  colours: string[];
  sizes: string[];
  grid: Record<string, number>;
  items: Record<string, string>;
};

export type VariantRow = {
  item: string;
  colour: string;
  size: string;
  label: string;
  qty: number;
};

export type VariantStock = {
  product: string;
  colours: string[];
  sizes: string[];
  variants: VariantRow[];
};

/**
 * Every colour and size of an item's product with its stock, from the site's
 * `variant_stock` API. Undefined when the item has no product or the site has
 * no such API.
 */
export async function getVariantStock(
  item: string
): Promise<VariantStock | undefined> {
  let data: VariantStockResponse | undefined;
  try {
    data = await call<VariantStockResponse>('variant_stock', { item });
  } catch {
    return;
  }

  if (!data?.product) {
    return;
  }

  const variants: VariantRow[] = [];
  for (const colour of data.colours) {
    for (const size of data.sizes) {
      const key = `${colour}|${size}`;
      const variantItem = data.items[key];
      if (!variantItem) {
        continue;
      }

      const label = [colour, size]
        .filter((part) => part && part !== '-')
        .join(' · ');
      variants.push({
        item: variantItem,
        colour,
        size,
        label: label || variantItem,
        qty: Number(data.grid[key] ?? 0),
      });
    }
  }

  const used = (part: 'colour' | 'size') =>
    (part === 'colour' ? data!.colours : data!.sizes).filter((value) =>
      variants.some((variant) => variant[part] === value)
    );

  return {
    product: data.product,
    colours: used('colour'),
    sizes: used('size'),
    variants,
  };
}
