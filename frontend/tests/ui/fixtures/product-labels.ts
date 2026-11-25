import { fyo } from 'src/initFyo';
import 'src/router';
import { FrappeUI, FrappeUIProvider } from 'frappe-ui';
import ProductLabelsDialog from 'src/components/ProductLabelsDialog.vue';
import { openProductLabels } from 'src/utils/productLabelsState';
import { loadFrappeFixture } from './frappe';
import { languageDirectionKey } from 'src/utils/injectionKeys';
import { createApp, h, markRaw, ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import 'src/styles/index.css';

// A product as the site's Product form holds it, with one Item per colour and size.
const sizes = ['UK 6', 'UK 7', 'UK 8'];
const colours = ['White', 'Navy'];
const variants = colours.flatMap((colour, c) =>
  sizes.map((size, s) => ({
    item: `PUMA SMASH - ${colour} - ${size}`,
    colour,
    size,
    barcode: `2000000003${c}${s}1`,
  }))
);
const stock: Record<string, number> = {
  'White|UK 6': 6, 'White|UK 7': 12, 'White|UK 8': 9,
  'Navy|UK 6': 0, 'Navy|UK 7': 4, 'Navy|UK 8': 3,
};

const requests: { path: string; body: any }[] = [];
const printed: string[] = [];

function answer(path: string, body: Record<string, any>) {
  requests.push({ path, body });
  if (path.endsWith('variant_stock')) {
    return {
      message: {
        item: body.item,
        product: 'PUMA SMASH',
        colours,
        sizes,
        grid: stock,
        items: Object.fromEntries(variants.map((v) => [`${v.colour}|${v.size}`, v.item])),
      },
    };
  }
  if (path.includes('/document/Barcode Print')) {
    return { data: { name: 'BP-0007', ...body } };
  }
  if (path.endsWith('frappe.client.get_list')) {
    return { message: body.doctype === 'Print Format' ? [{ name: 'Barcode Labels (Batch)' }] : [] };
  }
  if (path.endsWith('get_html_and_style')) {
    return { message: { html: `<p>Labels ${body.name}</p>`, style: '' } };
  }
  return { message: [], data: [] };
}

async function mount() {
  await loadFrappeFixture(answer);
  markRaw(fyo);
  fyo.singles.SystemSettings = { currency: 'INR', locale: 'en-IN', display_precision: 2 } as any;
  fyo.can = () => true;

  const app = createApp({
    render: () =>
      h(FrappeUIProvider, {}, {
        default: () => h('main', { class: 'h-screen bg-surface-base' }, [h(ProductLabelsDialog)]),
      }),
  });
  app.use(FrappeUI);
  app.use(createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { render: () => null } }] }));
  app.mixin({ computed: { fyo: () => fyo, platform: () => 'Web' }, methods: { t: fyo.t, T: fyo.T } });
  app.provide(languageDirectionKey, ref('ltr'));
  app.mount('#app');

  // The frame's print() is recorded rather than opening the dialog.
  new MutationObserver(() => {
    const frame = document.querySelector('iframe[title="print"]') as HTMLIFrameElement | null;
    if (frame?.contentWindow && !(frame as any).patched) {
      (frame as any).patched = true;
      frame.contentWindow.print = () => {
        printed.push(frame.contentDocument!.body.textContent ?? '');
        frame.contentWindow!.dispatchEvent(new Event('afterprint'));
      };
    }
  }).observe(document.body, { childList: true });

  (window as any).labelsFixture = {
    requests,
    printed,
    open: () => openProductLabels({ name: 'PUMA SMASH', product_name: 'Puma Smash', variants } as any),
  };
}

void mount();
