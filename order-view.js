
import { supabase } from "./supabase-client.js";

const orderId = new URLSearchParams(window.location.search).get("id");

const state = {
  user: null,
  order: null,
  items: [],
  shipment: null,
  payment: null,
  customer: null,
  history: [],
  images: new Map()
};

const root = document.getElementById("pageRoot");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function money(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day:"2-digit",month:"short",year:"numeric"
  });
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day:"2-digit",month:"short",year:"numeric",
    hour:"2-digit",minute:"2-digit"
  });
}

function cleanStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function statusLabel(value) {
  const s = cleanStatus(value);
  const labels = {
    pending:"Order Placed",
    confirmed:"Confirmed",
    processing:"Processing",
    packed:"Packed",
    shipped:"Shipped",
    out_for_delivery:"Out for Delivery",
    delivered:"Delivered",
    delivery_failed:"Delivery Failed",
    cancelled:"Cancelled",
    canceled:"Cancelled",
    return_requested:"Return Requested",
    return_approved:"Return Approved",
    return_rejected:"Return Rejected",
    return_picked_up:"Return Picked Up",
    return_received:"Return Received",
    refund_initiated:"Refund Initiated",
    refunded:"Refunded"
  };
  return labels[s] || String(value || "Status").replace(/_/g," ").replace(/\b\w/g,m => m.toUpperCase());
}

function historyForStatus(status) {
  const target = cleanStatus(status);
  return (state.history || []).filter(item =>
    cleanStatus(item.to_status) === target
  ).sort((a,b) => new Date(a.changed_at || 0) - new Date(b.changed_at || 0));
}

function historyMetadata(item) {
  const meta = item?.metadata;
  if (!meta) return {};
  if (typeof meta === "object") return meta;
  try { return JSON.parse(meta); } catch { return {}; }
}

function statusReason(status) {
  const event = historyForStatus(status).at(-1);
  if (!event) return "";
  const meta = historyMetadata(event);
  return String(meta.reason || meta.cancel_reason || meta.failure_reason || meta.return_reason || meta.rejection_reason || meta.refund_reference || event.remarks || "").trim();
}

function statusSpecificInfoHtml(status) {
  const s = cleanStatus(status);
  const event = historyForStatus(s).at(-1);
  const reason = statusReason(s);
  const meta = historyMetadata(event);
  let title = "";
  let value = "";
  let note = "";

  if (s === "cancelled" || s === "canceled") {
    if (!reason) return "";
    title = "Cancellation Reason";
    value = reason;
    note = event?.changed_at ? `Cancelled on ${formatDateTime(event.changed_at)}` : "";
  } else if (s === "delivery_failed") {
    if (!reason) return "";
    title = "Delivery Failed";
    value = reason;
    note = event?.changed_at ? `Updated on ${formatDateTime(event.changed_at)}` : "";
  } else if (s === "return_requested") {
    if (!reason) return "";
    title = "Return Reason";
    value = reason;
    note = event?.changed_at ? `Requested on ${formatDateTime(event.changed_at)}` : "";
  } else if (s === "return_rejected") {
    if (!reason) return "";
    title = "Return Rejection Reason";
    value = reason;
    note = event?.changed_at ? `Rejected on ${formatDateTime(event.changed_at)}` : "";
  } else if (s === "refund_initiated") {
    const reference = String(meta.refund_reference || reason || "").trim();
    if (!reference) return "";
    title = "Refund Information";
    value = reference;
    note = event?.changed_at ? `Refund initiated on ${formatDateTime(event.changed_at)}` : "";
  } else if (s === "refunded") {
    if (!reason) return "";
    title = "Refund Note";
    value = reason;
    note = event?.changed_at ? `Refund completed on ${formatDateTime(event.changed_at)}` : "";
  }

  if (!title || !value) return "";
  return `
    <div class="tracking-box">
      <div class="tracking-label">${escapeHtml(title)}</div>
      <div class="tracking-number" style="font-weight:600;white-space:normal;line-height:1.55">${escapeHtml(value)}</div>
      ${note ? `<div class="timeline-note">${escapeHtml(note)}</div>` : ""}
    </div>
  `;
}

function shipmentRelevant(status) {
  return ["shipped","out_for_delivery","delivered","delivery_failed"].includes(cleanStatus(status));
}

function orderStatusInfo(status) {
  const s = cleanStatus(status);

  const exact = {
    pending:["Pending","pending"],
    confirmed:["Confirmed","processing"],
    processing:["Processing","processing"],
    packed:["Packed","processing"],
    shipped:["Shipped","shipped"],
    out_for_delivery:["Out for Delivery","shipped"],
    delivered:["Delivered","completed"],
    delivery_failed:["Delivery Failed","canceled"],
    cancelled:["Cancelled","canceled"],
    canceled:["Cancelled","canceled"],
    return_requested:["Return Requested","processing"],
    return_approved:["Return Approved","processing"],
    return_rejected:["Return Rejected","canceled"],
    return_picked_up:["Return Picked Up","processing"],
    return_received:["Return Received","processing"],
    refund_initiated:["Refund Initiated","processing"],
    refunded:["Refunded","completed"]
  };
  if (exact[s]) return {label:exact[s][0],bucket:exact[s][1]};

  if (s.includes("cancel")) return {label:"Cancelled",bucket:"canceled"};
  if (s.includes("deliver")) return {label:"Delivered",bucket:"completed"};
  if (s.includes("ship")) return {label:"Shipped",bucket:"shipped"};
  if (s.includes("process") || s.includes("confirm") || s.includes("return") || s.includes("refund")) return {label:statusLabel(s),bucket:"processing"};

  return {label:"Pending",bucket:"pending"};
}

function paymentLabel(value) {
  const s = cleanStatus(value);
  const map = {
    paid:"Paid",
    pending:"Pending",
    failed:"Failed",
    refunded:"Refunded",
    partially_refunded:"Partially Refunded"
  };
  return map[s] || (value ? String(value).replace(/_/g," ") : "Not available");
}

function paymentMethodLabel(value) {
  const s = cleanStatus(value);
  if (s === "upi") return "UPI";
  if (s === "cod") return "Cash on Delivery";
  return value ? String(value).replace(/_/g," ") : "Not available";
}

function addressParts(address) {
  const a = address || {};
  return {
    name: a.full_name || "Customer",
    phone: a.phone || "",
    lines: [
      a.address_line1 || a.address || "",
      a.address_line2 || "",
      [a.city,a.state,a.pincode].filter(Boolean).join(", "),
      a.landmark ? `Landmark: ${a.landmark}` : ""
    ].filter(Boolean)
  };
}

function latestImage(productId) {
  return state.images.get(productId) || null;
}

function statusTimeline() {
  const order = state.order;
  const shipment = state.shipment;
  const orderStatus = cleanStatus(order.status);
  const shipmentStatus = cleanStatus(shipment?.shipment_status);
  const history = state.history || [];

  const eventDate = status => {
    const event = historyForStatus(status).at(-1);
    return event?.changed_at || null;
  };

  const placed = {title:"Order Placed",date:formatDateTime(order.created_at),done:true};
  const canceled = orderStatus === "cancelled" || orderStatus === "canceled";
  if (canceled) {
    return [placed,{
      title:"Order Cancelled",
      date:formatDateTime(eventDate("cancelled") || eventDate("canceled") || order.updated_at || order.created_at),
      done:true
    }];
  }

  const has = status => history.some(item => cleanStatus(item.to_status) === status);
  const processingDone = has("confirmed") || has("processing") || has("packed") || shipmentRelevant(orderStatus) || Boolean(shipment);
  const packedDone = has("packed") || shipmentRelevant(orderStatus) || Boolean(shipment?.shipped_date);
  const shippedDone = Boolean(shipment?.shipped_date) || has("shipped") || shipmentStatus.includes("ship") || shipmentStatus.includes("transit") || shipmentStatus.includes("out") || shipmentStatus.includes("deliver");
  const outDone = has("out_for_delivery") || shipmentStatus.includes("out") || shipmentStatus.includes("deliver");
  const deliveredDone = Boolean(shipment?.delivered_date) || has("delivered") || shipmentStatus.includes("deliver") || orderStatus === "delivered";

  const steps = [
    placed,
    {title:"Processing",date:eventDate("processing") ? formatDateTime(eventDate("processing")) : (processingDone ? "Order is being prepared" : "Awaiting processing"),done:processingDone},
    {title:"Packed",date:eventDate("packed") ? formatDateTime(eventDate("packed")) : (packedDone ? "Package prepared" : "Awaiting packing"),done:packedDone},
    {title:"Shipped",date:shipment?.shipped_date ? formatDateTime(shipment.shipped_date) : (eventDate("shipped") ? formatDateTime(eventDate("shipped")) : (shippedDone ? "Shipment in transit" : "Not shipped yet")),done:shippedDone},
    {title:"Out for Delivery",date:eventDate("out_for_delivery") ? formatDateTime(eventDate("out_for_delivery")) : (outDone ? "Your package is on the way" : (shipment?.expected_delivery_date ? `Expected by ${formatDate(shipment.expected_delivery_date)}` : "Awaiting delivery")),done:outDone},
    {title:"Delivered",date:shipment?.delivered_date ? formatDateTime(shipment.delivered_date) : (eventDate("delivered") ? formatDateTime(eventDate("delivered")) : (deliveredDone ? "Delivered" : (shipment?.expected_delivery_date ? `Expected by ${formatDate(shipment.expected_delivery_date)}` : "Not delivered yet"))),done:deliveredDone}
  ];

  if (orderStatus === "delivery_failed") {
    steps.push({title:"Delivery Failed",date:formatDateTime(eventDate("delivery_failed") || order.updated_at),done:true});
  }

  if (orderStatus.startsWith("return_") || orderStatus === "refund_initiated" || orderStatus === "refunded") {
    const returnSteps = ["return_requested","return_approved","return_picked_up","return_received","refund_initiated","refunded"];
    returnSteps.forEach(code => {
      if (has(code) || code === orderStatus) {
        steps.push({title:statusLabel(code),date:formatDateTime(eventDate(code) || (code === orderStatus ? order.updated_at : null)),done:has(code) || code === orderStatus});
      }
    });
    if (orderStatus === "return_rejected") {
      steps.push({title:"Return Rejected",date:formatDateTime(eventDate("return_rejected") || order.updated_at),done:true});
    }
  }

  return steps;
}

function renderTimeline() {
  const steps = statusTimeline();
  const currentIndex = steps.findIndex(step => !step.done);

  return steps.map((step,index) => {
    const done = step.done;
    const current = !done && index === currentIndex;
    return `
      <div class="timeline-step ${done ? "done" : ""} ${current ? "current" : ""}">
        <div class="timeline-marker">${done ? "✓" : index + 1}</div>
        <div class="timeline-content">
          <div class="timeline-title">${escapeHtml(step.title)}</div>
          <div class="timeline-date">${escapeHtml(step.date)}</div>
        </div>
      </div>
    `;
  }).join("");
}

function renderItems() {
  if (!state.items.length) {
    return `<div class="timeline-note">No order items are available.</div>`;
  }

  return state.items.map(item => {
    const image = latestImage(item.product_id);
    const imageHtml = image
      ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(item.product_name || "Product")}" loading="lazy">`
      : "SS";

    return `
      <div class="order-item">
        <div class="order-item-image">${imageHtml}</div>
        <div>
          <div class="order-item-name">${escapeHtml(item.product_name || "Product")}</div>
          <div class="order-item-detail">Qty ${Number(item.quantity || 0)}</div>
        </div>
        <div class="order-item-price">
          <strong>₹${money(item.subtotal)}</strong>
          <span>₹${money(item.product_price)} each</span>
        </div>
      </div>
    `;
  }).join("");
}

function renderAddress() {
  const a = addressParts(state.order.shipping_address);
  const name = state.customer?.full_name || a.name;
  const phone = a.phone || state.customer?.phone || "";
  return `
    <div class="address-box">
      <div class="address-name">${escapeHtml(name)}</div>
      <div class="address-line">${a.lines.map(escapeHtml).join("<br>")}</div>
      ${phone ? `<div class="address-line">${escapeHtml(phone)}</div>` : ""}
    </div>
  `;
}

function renderPayment() {
  const method = state.payment?.payment_method || null;
  const status = state.payment?.status || state.order.payment_status;
  const provider = state.payment?.provider ? ` · ${escapeHtml(state.payment.provider)}` : "";
  const paidAt = state.payment?.paid_at ? ` · ${escapeHtml(formatDateTime(state.payment.paid_at))}` : "";
  return `
    <div class="payment-box">
      <div class="payment-icon">₹</div>
      <div class="payment-copy">
        <strong>${escapeHtml(paymentMethodLabel(method))}</strong>
        <span>${escapeHtml(paymentLabel(status))}${provider}${paidAt}</span>
      </div>
    </div>
  `;
}

function renderShipment() {
  const shipment = state.shipment;
  const orderStatus = cleanStatus(state.order?.status);
  const isShipmentStage = shipmentRelevant(orderStatus);
  const statusInfo = statusSpecificInfoHtml(orderStatus);

  if (!isShipmentStage) {
    return `
      <div class="shipment-summary">
        <div class="shipment-summary-main">
          <div class="shipment-icon">✦</div>
          <div>
            <div class="shipment-summary-label">ORDER UPDATE</div>
            <div class="shipment-summary-name">${escapeHtml(statusLabel(orderStatus))}</div>
            <div class="shipment-summary-method">Shipment and tracking details will appear once your order reaches the shipping stage.</div>
          </div>
        </div>
      </div>
      ${statusInfo}
      <div class="timeline">${renderTimeline()}</div>
    `;
  }

  if (!shipment) {
    return `
      <div class="shipment-summary">
        <div class="shipment-summary-main">
          <div class="shipment-icon">🚚</div>
          <div>
            <div class="shipment-summary-label">SHIPMENT</div>
            <div class="shipment-summary-name">Shipment is being prepared</div>
            <div class="shipment-summary-method">Tracking information will appear here once courier details are available.</div>
          </div>
        </div>
      </div>
      ${statusInfo}
      <div class="timeline">${renderTimeline()}</div>
    `;
  }

  const trackingButton = shipment.tracking_url
    ? `<a class="track-btn" href="${escapeHtml(shipment.tracking_url)}" target="_blank" rel="noopener noreferrer">Track Courier ↗</a>`
    : "";

  const deliveryDate = shipment.delivered_date
    ? `<div class="notes-box"><strong>Delivered</strong><br>${escapeHtml(formatDateTime(shipment.delivered_date))}</div>`
    : shipment.expected_delivery_date
      ? `<div class="notes-box"><strong>Expected Delivery</strong><br>${escapeHtml(formatDate(shipment.expected_delivery_date))}</div>`
      : "";

  return `
    <div class="shipment-summary">
      <div class="shipment-summary-main">
        <div class="shipment-icon">🚚</div>
        <div>
          <div class="shipment-summary-label">SHIPMENT PARTNER</div>
          <div class="shipment-summary-name">${escapeHtml(shipment.courier_name || "Courier")}</div>
          <div class="shipment-summary-method">${escapeHtml(shipment.shipping_method || "Standard delivery")}</div>
        </div>
      </div>
      <div class="package">
        <span class="package-label">PACKAGE</span>
        <strong>${Number(shipment.package_count || 1)}</strong>
      </div>
    </div>

    <div class="timeline">${renderTimeline()}</div>

    <div class="tracking-box">
      <div class="tracking-label">Tracking Number</div>
      <div class="tracking-number">${escapeHtml(shipment.tracking_number || "Not available")}</div>
      <div class="tracking-actions">
        ${trackingButton}
        ${shipment.tracking_number ? `<button class="copy-track" type="button" id="copyTracking">Copy Number</button>` : ""}
      </div>
    </div>

    ${deliveryDate}
    ${statusInfo}
    ${shipment.notes ? `<div class="notes-box">${escapeHtml(shipment.notes)}</div>` : ""}
  `;
}


async function openInvoicePreview() {
  if (!state.order) {
    showToast("Order data is not available.");
    return;
  }

  const invoiceWindow = window.open("", "_blank", "width=900,height=950");
  if (!invoiceWindow) {
    alert("Please allow pop-ups to preview the invoice.");
    return;
  }

  const safe = escapeHtml;
  const order = state.order;
  const address = addressParts(order.shipping_address);
  const customer = state.customer || {};

  let storeAddress = "";
  try {
    const { data, error } = await supabase
      .from("parameter_values")
      .select("description")
      .eq("parameter_code", "SHOP_ADDRESS")
      .eq("is_active", true)
      .maybeSingle();

    if (!error) storeAddress = data?.description || "";
  } catch (error) {
    console.warn("Invoice store address warning:", error);
  }

  const fromName = "SS SPARK COLLECTIONS";
  const fromPhone = "6383270648";
  const fromEmail = "";
  const itemRows = state.items.length
    ? state.items.map((item, index) => `
        <tr>
          <td class="serial">${index + 1}</td>
          <td><div class="product-name">${safe(item.product_name || "Product")}</div></td>
          <td class="center">${Number(item.quantity || 0)}</td>
          <td class="right">₹${money(item.product_price)}</td>
          <td class="right strong">₹${money(item.subtotal)}</td>
        </tr>
      `).join("")
    : `<tr><td colspan="5" class="empty">No order items found.</td></tr>`;

  const addressText = address.lines.map(safe).join("<br>");
  const customerName = customer.full_name || address.name || "Customer";
  const customerPhone = customer.phone || address.phone || "";

  invoiceWindow.document.open();
  invoiceWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Invoice - ${safe(order.order_number || order.id)}</title>
<style>
*{box-sizing:border-box}
body{margin:0;padding:30px;background:#f7f3f5;color:#2b2026;font:12px Arial,Helvetica,sans-serif}
.invoice-container{max-width:850px;margin:0 auto}
.invoice{background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 12px 40px rgba(50,25,40,.09);border:1px solid #eadfe5}
.header{padding:30px 35px;display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #eee5e9}
.brand{font:700 18px Georgia,serif;color:#542238;letter-spacing:.2px}
.brand-sub{margin-top:6px;font-size:10px;color:#8b747f}
.invoice-title{text-align:right}.invoice-title h1{margin:0;font:600 25px Georgia,serif;letter-spacing:1px}.invoice-title span{display:block;margin-top:5px;font-size:10px;color:#8b747f}
.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;padding:20px 35px;background:#fff8fb}
.meta-item{padding:10px}.meta-label{display:block;margin-bottom:5px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#967f89}.meta-value{font-size:12px;font-weight:700}
.addresses{display:grid;grid-template-columns:1fr 1fr;gap:18px;padding:28px 35px}
.address-card{padding:18px;border:1px solid #eadfe5;border-radius:13px;background:#fffafd}.address-heading{margin-bottom:12px;font-size:9px;font-weight:800;letter-spacing:1px;color:#d6296f}.address-name{margin-bottom:5px;font-size:14px;font-weight:700}.address-text{font-size:11px;line-height:1.6;color:#66555e}.address-phone{margin-top:7px;font-size:10px;color:#66555e}
.items{padding:0 35px}.section-title{margin:0 0 12px;font-size:14px;font-weight:800}
table{width:100%;border-collapse:collapse}thead th{padding:11px 9px;text-align:left;background:#faf4f7;border-bottom:1px solid #eadfe5;font-size:9px;text-transform:uppercase;letter-spacing:.6px;color:#7e6a73}tbody td{padding:14px 9px;border-bottom:1px solid #f1e9ed;font-size:12px}.serial{width:35px;color:#a08b94}.product-name{font-weight:700}.center{text-align:center}.right{text-align:right}.strong{font-weight:700}.empty{padding:25px!important;text-align:center;color:#8b747f}
.summary-wrapper{display:flex;justify-content:flex-end;padding:25px 35px}.summary{width:320px}.summary-row{display:flex;justify-content:space-between;padding:7px 0;font-size:12px;color:#67565f}.summary-row.total{margin-top:8px;padding-top:13px;border-top:1px solid #ded3d8;font-size:16px;font-weight:800;color:#2b2026}.summary-row.total span:last-child{color:#d6296f}
.footer{padding:25px 35px 30px;text-align:center;border-top:1px solid #eee5e9}.quote{font-size:12px;font-weight:600;color:#55444d}.thanks{margin-top:10px;font-size:10px;color:#9b858e}
.print-button{display:block;margin:0 auto 28px;padding:11px 20px;border:0;border-radius:999px;background:#d6296f;color:#fff;font-weight:700;cursor:pointer}
@media print{body{padding:0;background:#fff}.invoice{box-shadow:none;border:0}.print-button{display:none}}
@media(max-width:650px){body{padding:10px}.header{padding:22px 18px}.meta{grid-template-columns:1fr;padding:15px 18px}.addresses{grid-template-columns:1fr;padding:20px 18px}.items{padding:0 18px}.summary-wrapper{padding:22px 18px}.summary{width:100%}.footer{padding:22px 18px}}
</style>
</head>
<body>
<div class="invoice-container">
<button class="print-button" onclick="window.print()">Print / Save as PDF</button>
<div class="invoice">
<div class="header">
  <div><div class="brand">${safe(fromName)}</div><div class="brand-sub">Carefully packed with love</div></div>
  <div class="invoice-title"><h1>INVOICE</h1><span>${safe(order.order_number || order.id)}</span></div>
</div>
<div class="meta">
  <div class="meta-item"><span class="meta-label">Order Date</span><div class="meta-value">${safe(formatDate(order.created_at))}</div></div>
  <div class="meta-item"><span class="meta-label">Payment Status</span><div class="meta-value">${safe(paymentLabel(order.payment_status))}</div></div>
  <div class="meta-item"><span class="meta-label">Order Status</span><div class="meta-value">${safe(orderStatusInfo(order.status).label)}</div></div>
</div>
<div class="addresses">
  <div class="address-card">
    <div class="address-heading">FROM</div>
    <div class="address-name">${safe(fromName)}</div>
    <div class="address-text">${safe(storeAddress) || "Store address not configured."}</div>
    <div class="address-phone">Phone: ${safe(fromPhone)}</div>
    ${fromEmail ? `<div class="address-phone">Email: ${safe(fromEmail)}</div>` : ""}
  </div>
  <div class="address-card">
    <div class="address-heading">BILL TO / SHIP TO</div>
    <div class="address-name">${safe(customerName)}</div>
    <div class="address-text">${addressText || "Address not available."}</div>
    ${customerPhone ? `<div class="address-phone">Phone: ${safe(customerPhone)}</div>` : ""}
  </div>
</div>
<div class="items">
  <h2 class="section-title">Order Items</h2>
  <table><thead><tr><th>#</th><th>Product</th><th>Qty</th><th class="right">Price</th><th class="right">Total</th></tr></thead><tbody>${itemRows}</tbody></table>
</div>
<div class="summary-wrapper">
  <div class="summary">
    <div class="summary-row"><span>Subtotal</span><span>₹${money(order.subtotal)}</span></div>
    <div class="summary-row"><span>Discount</span><span>− ₹${money(order.discount_amount)}</span></div>
    <div class="summary-row"><span>Shipping</span><span>${Number(order.shipping_amount || 0) === 0 ? "Free" : "₹" + money(order.shipping_amount)}</span></div>
    <div class="summary-row total"><span>Grand Total</span><span>₹${money(order.total_amount)}</span></div>
  </div>
</div>
<div class="footer"><div class="quote">Thank you for shopping with SS Spark Collections</div><div class="thanks">Inclusive of all taxes · Carefully packed with love</div></div>
</div>
</div>
</body></html>`);
  invoiceWindow.document.close();
  invoiceWindow.focus();
}

function renderPage() {
  const status = orderStatusInfo(state.order.status);
  const itemCount = state.items.reduce((sum,item) => sum + Number(item.quantity || 0),0);

  root.innerHTML = `
    <div class="order-view-head">
      <div>
        <p class="order-view-eyebrow">SS SPARK COLLECTIONS</p>
        <h1>Order #${escapeHtml(state.order.order_number || state.order.id)}</h1>
        <div class="order-view-date">Placed on ${escapeHtml(formatDateTime(state.order.created_at))}</div>
      </div>
      <div class="order-view-actions">
        <button class="order-action primary" type="button" id="invoiceBtn">Download Invoice</button>
      </div>
    </div>

    <div class="order-status-hero">
      <div class="status-hero-copy">
        <div class="status-hero-icon">✓</div>
        <div>
          <strong>${escapeHtml(status.label)}</strong>
          <span>${itemCount} item${itemCount === 1 ? "" : "s"} · Total ₹${money(state.order.total_amount)}</span>
        </div>
      </div>
      <span class="status-pill status-${status.bucket}">${escapeHtml(status.label)}</span>
    </div>

    <div class="order-view-grid">
      <div class="order-view-left">
        <section class="ov-card">
          <div class="ov-card-head">
            <h2>Order Items</h2>
            <span>${itemCount} item${itemCount === 1 ? "" : "s"}</span>
          </div>
          <div class="ov-card-body">
            <div class="order-items">${renderItems()}</div>

            <div class="ov-totals">
              <div class="ov-total-row"><span>Subtotal</span><strong>₹${money(state.order.subtotal)}</strong></div>
              ${Number(state.order.discount_amount || 0) > 0 ? `<div class="ov-total-row discount"><span>Discount</span><strong>− ₹${money(state.order.discount_amount)}</strong></div>` : ""}
              <div class="ov-total-row"><span>Shipping</span><strong>${Number(state.order.shipping_amount || 0) === 0 ? "Free" : "₹"+money(state.order.shipping_amount)}</strong></div>
              <div class="ov-grand-total"><span>Total</span><span>₹${money(state.order.total_amount)}</span></div>
            </div>
          </div>
        </section>

        <section class="ov-card shipment-card">
          <div class="ov-card-head">
            <h2>Delivery Tracking</h2>
            <span>${state.shipment ? escapeHtml(state.shipment.shipment_status || "Shipment") : "Awaiting shipment"}</span>
          </div>
          <div class="ov-card-body">${renderShipment()}</div>
        </section>
      </div>

      <div class="order-view-right">
        <section class="ov-card">
          <div class="ov-card-head"><h2>Shipping Address</h2></div>
          <div class="ov-card-body">${renderAddress()}</div>
        </section>

        <section class="ov-card">
          <div class="ov-card-head"><h2>Payment</h2><span>${escapeHtml(paymentLabel(state.order.payment_status))}</span></div>
          <div class="ov-card-body">${renderPayment()}</div>
        </section>

        <section class="ov-card">
          <div class="ov-card-head"><h2>Order Information</h2></div>
          <div class="ov-card-body">
            <div class="info-grid">
              <div class="info-box"><span class="info-label">Customer</span><div class="info-value">${escapeHtml(state.customer?.full_name || addressParts(state.order.shipping_address).name || "Customer")}</div></div>
              <div class="info-box"><span class="info-label">Email</span><div class="info-value">${escapeHtml(state.customer?.email || state.user?.email || "—")}</div></div>
              <div class="info-box"><span class="info-label">Order Number</span><div class="info-value">${escapeHtml(state.order.order_number || state.order.id)}</div></div>
              <div class="info-box"><span class="info-label">Placed On</span><div class="info-value">${escapeHtml(formatDate(state.order.created_at))}</div></div>
              <div class="info-box"><span class="info-label">Payment Status</span><div class="info-value">${escapeHtml(paymentLabel(state.order.payment_status))}</div></div>
              <div class="info-box"><span class="info-label">Last Updated</span><div class="info-value subtle">${escapeHtml(formatDateTime(state.order.updated_at))}</div></div>
            </div>
          </div>
        </section>

        <section class="ov-card help-box">
          <div class="help-icon">♡</div>
          <strong>Need Help?</strong>
          <p>Contact SS Spark Collections support if you have any questions about this order.</p>
        </section>
      </div>
    </div>
  `;

  document.getElementById("invoiceBtn")?.addEventListener("click",openInvoicePreview);

  document.getElementById("copyTracking")?.addEventListener("click",async () => {
    try {
      await navigator.clipboard.writeText(state.shipment.tracking_number);
      const btn = document.getElementById("copyTracking");
      btn.textContent = "Copied ✓";
      setTimeout(() => btn.textContent = "Copy Number",1200);
    } catch {
      alert("Unable to copy the tracking number.");
    }
  });
}

async function updateHeaderCartCount(userId) {
  const cartCount = document.getElementById("cartCount");
  if (!cartCount) return;

  try {
    const {data:cart,error:cartError} = await supabase
      .from("carts")
      .select("id")
      .eq("user_id",userId)
      .maybeSingle();

    if (cartError) throw cartError;

    if (!cart) {
      cartCount.textContent = "0";
      return;
    }

    const {data:items,error:itemsError} = await supabase
      .from("cart_items")
      .select("quantity")
      .eq("cart_id",cart.id);

    if (itemsError) throw itemsError;

    const count = (items || []).reduce(
      (sum,item) => sum + Number(item.quantity || 0),
      0
    );

    cartCount.textContent = String(count);
  } catch (error) {
    console.error("Header cart count error:",error);
    cartCount.textContent = "0";
  }
}

async function updateAuthUI() {
  const authArea = document.getElementById("authArea");
  if (!authArea) return null;

  const {data:{user},error} = await supabase.auth.getUser();

  if (error) {
    console.error("Auth loading error:",error);
  }

  if (!user) {
    window.location.href = "login.html";
    return null;
  }

  const {data:profile,error:profileError} = await supabase
    .from("profiles")
    .select("full_name,role")
    .eq("id",user.id)
    .maybeSingle();

  if (profileError) {
    console.warn("Profile load warning:",profileError);
  }

  const displayName =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.email ||
    "Customer";

  authArea.innerHTML = `
    <div class="profile-dropdown">
      <button class="profile-trigger" id="profileTrigger" type="button">
        <span class="profile-avatar">✦</span>
        <span>Hi, ${escapeHtml(displayName)}</span>
        <span class="profile-arrow">⌄</span>
      </button>

      <div class="profile-menu" id="profileMenu">
        <div class="profile-menu-header">
          <div class="profile-menu-avatar">✦</div>
          <div>
            <strong>${escapeHtml(displayName)}</strong>
            <small>${escapeHtml(user.email || "")}</small>
          </div>
        </div>

        <div class="profile-menu-divider"></div>

        <a href="wishlist.html" class="profile-menu-item">
          <span>♡</span><span>Wishlist</span>
        </a>

        <a href="order-lists.html" class="profile-menu-item">
          <span>♧</span><span>My Orders</span>
        </a>

        ${profile?.role === "admin" ? `
<a href="admin.html" class="profile-menu-item">
    <span>⚙</span>
    <span>Admin Panel</span>
</a>
` : ""}

        <div class="profile-menu-divider"></div>

        <button id="logoutBtn" class="profile-menu-logout" type="button">
          <span>↪</span><span>Logout</span>
        </button>
      </div>
    </div>
  `;

  const trigger = document.getElementById("profileTrigger");
  const menu = document.getElementById("profileMenu");

  trigger?.addEventListener("click",event => {
    event.stopPropagation();
    menu?.classList.toggle("show");
  });

  document.addEventListener("click",event => {
    if (
      menu &&
      trigger &&
      !menu.contains(event.target) &&
      !trigger.contains(event.target)
    ) {
      menu.classList.remove("show");
    }
  });

  document.getElementById("logoutBtn")?.addEventListener("click",async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      window.location.href = "login.html";
    }
  });

  await updateHeaderCartCount(user.id);
  return user;
}


async function loadOrder() {
  if (!orderId) throw new Error("Order ID is missing.");

  // Match the admin order-details query: customer access is restricted
  // to the authenticated user's own order.
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(`
      id,
      user_id,
      order_number,
      status,
      payment_status,
      subtotal,
      discount_amount,
      shipping_amount,
      total_amount,
      shipping_address,
      created_at,
      updated_at
    `)
    .eq("id", orderId)
    .eq("user_id", state.user.id)
    .maybeSingle();

  if (orderError) throw orderError;
  if (!order) throw new Error("Order not found or you do not have access to this order.");

  state.order = order;

  // Order items are required for the customer order page.
  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select(`
      id,
      product_id,
      product_name,
      product_price,
      quantity,
      subtotal,
      created_at
    `)
    .eq("order_id", order.id)
    .order("created_at", { ascending: true });

  if (itemsError) throw itemsError;
  state.items = items || [];

  // Customer-visible workflow history. This is read-only and is used only
  // to show meaningful status updates/reasons on the order page.
  try {
    const { data: history, error: historyError } = await supabase
      .from("order_status_history")
      .select("id,order_id,from_status,to_status,action_code,action_name,changed_at,remarks,metadata")
      .eq("order_id", order.id)
      .order("changed_at", { ascending: true });

    if (historyError) {
      console.warn("Order history warning:", historyError);
      state.history = [];
    } else {
      state.history = history || [];
    }
  } catch (error) {
    console.warn("Order history warning:", error);
    state.history = [];
  }

  // Shipment is optional. A missing shipment must never stop the order page.
  try {
    const { data: shipment, error: shipmentError } = await supabase
      .from("order_shipments")
      .select(`
        id,
        order_id,
        courier_name,
        tracking_number,
        tracking_url,
        shipped_date,
        expected_delivery_date,
        delivered_date,
        shipment_status,
        shipping_method,
        package_count,
        notes
      `)
      .eq("order_id", order.id)
      .maybeSingle();

    if (shipmentError) {
      console.warn("Shipment load warning:", shipmentError);
      state.shipment = null;
    } else {
      state.shipment = shipment || null;
    }
  } catch (error) {
    console.warn("Shipment load warning:", error);
    state.shipment = null;
  }

  // Payment is optional. The schema supports paid_at and created_at,
  // but payment visibility must not block the customer order page.
  try {
    const { data: payments, error: paymentError } = await supabase
      .from("payments")
      .select(`
        id,
        order_id,
        provider,
        amount,
        status,
        payment_method,
        paid_at,
        created_at
      `)
      .eq("order_id", order.id)
      .order("paid_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(1);

    if (paymentError) {
      console.warn("Payment load warning:", paymentError);
      state.payment = null;
    } else {
      state.payment = payments?.[0] || null;
    }
  } catch (error) {
    console.warn("Payment load warning:", error);
    state.payment = null;
  }

  // Customer profile is used only to enrich the order/invoice display.
  try {
    const { data: customer, error: customerError } = await supabase
      .from("profiles")
      .select("id,full_name,email,phone")
      .eq("id", order.user_id)
      .maybeSingle();

    if (customerError) {
      console.warn("Customer profile warning:", customerError);
      state.customer = null;
    } else {
      state.customer = customer || null;
    }
  } catch (error) {
    console.warn("Customer profile warning:", error);
    state.customer = null;
  }

  // Product images are optional.
  state.images.clear();
  const productIds = [...new Set(
    state.items.map(item => item.product_id).filter(Boolean)
  )];

  if (productIds.length) {
    try {
      const { data: images, error: imageError } = await supabase
        .from("product_images")
        .select("product_id,image_url,is_primary,display_order")
        .in("product_id", productIds)
        .order("is_primary", { ascending: false })
        .order("display_order", { ascending: true });

      if (imageError) {
        console.warn("Product image warning:", imageError);
      } else {
        (images || []).forEach(image => {
          if (!state.images.has(image.product_id)) {
            state.images.set(image.product_id, image.image_url);
          }
        });
      }
    } catch (error) {
      console.warn("Product image warning:", error);
    }
  }

  renderPage();
}

async function init() {
  const user = await updateAuthUI();

  if (!user) {
    return;
  }

  state.user = user;

  try {
    await loadOrder();
  } catch(error) {
    console.error("Order view error:",error);
    root.innerHTML = `
      <div class="error-card">
        <div class="error-icon">!</div>
        <strong>We couldn't load this order</strong>
        <p>${escapeHtml(error.message || "Please refresh the page and try again.")}</p>
      </div>
    `;
  }
}

document.getElementById("orderBack")?.addEventListener("click",event => {
  event.preventDefault();

  const referrer = document.referrer;

  if (referrer) {
    try {
      const referrerUrl = new URL(referrer);

      if (
        referrerUrl.origin === window.location.origin &&
        referrerUrl.href !== window.location.href
      ) {
        window.history.back();
        return;
      }
    } catch {}
  }

  window.location.href = "orders.html";
});

document.getElementById("headerSearchBtn")?.addEventListener("click",() => {
  window.location.href = "search.html";
});

init();
