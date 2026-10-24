import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useCart } from "@/store/cart";
import { useSiteSettings } from "@/store/settings";
import { formatNaira } from "@/lib/format";
import { ProductMedia } from "@/components/brand";
import { BRAND } from "@/lib/config";

export function CartDrawer() {
  const { items, isOpen, close, remove, setQuantity, subtotal } = useCart();
  const whatsappNumber = useSiteSettings((s) => s.whatsappNumber);
  const total = subtotal();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    if (isOpen) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, close]);

  if (!isOpen) return null;

  const whatsappText = encodeURIComponent(
    `Hello ${BRAND.shortName}, I need help with my order.`,
  );
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${whatsappText}`
    : `https://wa.me/2349038560517?text=${whatsappText}`;

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Shopping cart">
      <div className="drawer-backdrop absolute inset-0" onClick={close} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-ivory flex flex-col shadow-2xl">
        <div className="flex items-center justify-between border-b border-ink/10 px-6 py-5">
          <h2 className="font-editorial text-xl">Your Cart</h2>
          <button
            onClick={close}
            aria-label="Close cart"
            className="p-2 -mr-2 text-stone hover:text-ink transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 2l14 14M16 2L2 16" />
            </svg>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 text-center">
            <p className="font-editorial text-2xl">Your cart is empty</p>
            <p className="text-sm text-stone max-w-[26ch]">
              Pieces you add will appear here.
            </p>
            <Link to="/shop" search={{ q: undefined, tier: undefined, min: undefined, max: undefined, size: undefined, colour: undefined, availability: undefined, sort: undefined }} onClick={close} className="btn-lux btn-lux-primary">
              Shop Collection
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6">
              <ul className="divide-y divide-ink/10">
                {items.map((item) => (
                  <li key={item.id} className="py-5 flex gap-4">
                    <Link
                      to="/product/$slug"
                      params={{ slug: item.slug }}
                      onClick={close}
                      className="shrink-0 w-20"
                    >
                      <ProductMedia url={item.imageUrl} alt={item.name} aspect="aspect-[5/6]" width={160} />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between gap-2">
                        <Link
                          to="/product/$slug"
                          params={{ slug: item.slug }}
                          onClick={close}
                          className="text-sm font-medium hover:text-oxblood transition-colors"
                        >
                          {item.name}
                        </Link>
                        <span className="text-sm whitespace-nowrap">
                          {item.quoteRequired ? "Quote" : formatNaira(item.unitPrice * item.quantity)}
                        </span>
                      </div>
                      {item.variantLabel && (
                        <p className="text-xs text-stone mt-1">{item.variantLabel}</p>
                      )}
                      <p className="text-xs mt-1 uppercase tracking-wide text-stone">
                        {item.purchaseOption === "complete_package"
                          ? "Complete Package"
                          : "Product Only"}
                      </p>
                      {item.designId ? (
                        <p className="text-xs text-gold mt-1 tracking-wide">
                          Custom design {item.designId} · price confirmed by quote
                        </p>
                      ) : item.customization ? (
                        <p className="text-xs text-gold mt-1 tracking-wide uppercase">
                          Custom piece
                        </p>
                      ) : null}
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center border border-ink/20">
                          <button
                            onClick={() => setQuantity(item.id, item.quantity - 1)}
                            aria-label={`Decrease quantity of ${item.name}`}
                            className="w-8 h-8 flex items-center justify-center hover:bg-ink/5"
                          >
                            −
                          </button>
                          <span className="w-8 text-center text-sm" aria-live="polite">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => setQuantity(item.id, item.quantity + 1)}
                            aria-label={`Increase quantity of ${item.name}`}
                            className="w-8 h-8 flex items-center justify-center hover:bg-ink/5"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => remove(item.id)}
                          className="text-xs text-stone hover:text-oxblood uppercase tracking-wider"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-ink/10 px-6 py-5 space-y-4">
              <div className="flex justify-between text-sm">
                <span className="uppercase tracking-luxe text-xs text-stone self-center">
                  Subtotal
                </span>
                <span className="font-editorial text-xl">{formatNaira(total)}</span>
              </div>
              <p className="text-xs text-stone">
                Delivery is calculated at checkout once you select your state
                (included with Complete Package orders).
              </p>
              <Link
                to="/checkout"
                onClick={close}
                className="btn-lux btn-lux-primary w-full"
              >
                Checkout
              </Link>
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-xs uppercase tracking-btn text-stone hover:text-ink transition-colors"
                >
                  Message {BRAND.shortName} on WhatsApp
                </a>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}