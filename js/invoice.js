// =====================================================
// SS SPARK COLLECTIONS - INVOICE
// =====================================================

async function openInvoicePreview(order, orderItems, supabase) {

    if (!order) {
        window.showOrderAlert?.("Order data is not available.", "error", "Invoice unavailable");
        return;
    }

    // Open immediately so popup blocker does not interfere
    const invoiceWindow = window.open(
        "",
        "_blank",
        "width=900,height=950"
    );

    if (!invoiceWindow) {
        window.showOrderAlert?.("Please allow pop-ups to preview the invoice.", "error", "Popup blocked");
        return;
    }

    // -------------------------------------------------
    // Helpers
    // -------------------------------------------------

    const money = (value) => {

        const number = Number(value || 0);

        return number.toLocaleString(
            "en-IN",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        );

    };


    const safe = (value) => {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    };


    const formatDate = (value) => {

        if (!value) return "-";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return safe(value);
        }

        return date.toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );

    };


    const addressLine = (address) => {

        if (!address) return "";

        return [
            address.address_line1,
            address.address_line2,
            address.city,
            address.state,
            address.pincode
        ]
            .filter(Boolean)
            .map(safe)
            .join(", ");

    };


    // -------------------------------------------------
    // Load store profile
    // -------------------------------------------------

    
    let storeAddress = "";

try {
    const {
        data,
        error
    } = await supabase
        .from("parameter_values")
        .select("description")
        .eq("parameter_code", "SHOP_ADDRESS")
        .eq("is_active", true)
        .maybeSingle();

    if (error) {
        throw error;
    }

    storeAddress = data?.description || "";

    

} catch (error) {
    console.error(
        "Shop address parameter error:",
        error
    );
}


    // -------------------------------------------------
    // FROM
    // -------------------------------------------------

    const fromName = "SS SPARK COLLECTIONS";


    const fromPhone = "6383270648"


    const fromEmail = "";


    // -------------------------------------------------
    // TO
    // -------------------------------------------------

    const to =
        order.shipping_address || {};


    const customer =
        order.customer || {};


    const toName =
        to.full_name ||
        customer.full_name ||
        "Customer";


    const toPhone =
        to.phone ||
        customer.phone ||
        "";


    // -------------------------------------------------
    // ITEMS
    // -------------------------------------------------

    const items = Array.isArray(orderItems)
        ? orderItems
        : [];


    const itemsHtml = items.length

        ? items.map(
            (item, index) => `

                <tr>

                    <td class="serial">
                        ${index + 1}
                    </td>

                    <td>
                        <div class="product-name">
                            ${safe(
                                item.product_name ||
                                "Product"
                            )}
                        </div>
                    </td>

                    <td class="center">
                        ${Number(
                            item.quantity || 0
                        )}
                    </td>

                    <td class="right">
                        ₹${money(
                            item.product_price
                        )}
                    </td>

                    <td class="right strong">
                        ₹${money(
                            item.subtotal
                        )}
                    </td>

                </tr>

            `
        ).join("")

        : `

            <tr>

                <td
                    colspan="5"
                    class="empty"
                >
                    No order items found.
                </td>

            </tr>

        `;


    // -------------------------------------------------
    // Open invoice
    // -------------------------------------------------

    invoiceWindow.document.open();

    invoiceWindow.document.write(`

<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
>

<title>
    Invoice -
    ${safe(order.order_number)}
</title>


<style>

/* =====================================================
   BASE
===================================================== */

* {
    box-sizing: border-box;
}


body {

    margin: 0;

    padding: 30px;

    background: #f7f3f5;

    color: #2b2026;

    font-family:
        Arial,
        Helvetica,
        sans-serif;

}


/* =====================================================
   WRAPPER
===================================================== */

.invoice-container {

    max-width: 850px;

    margin: 0 auto;

}


.invoice {

    background: #ffffff;

    border-radius: 16px;

    overflow: hidden;

    box-shadow:
        0 10px 35px
        rgba(50, 25, 40, .08);

    border:
        1px solid #eadfe5;

}


/* =====================================================
   HEADER
===================================================== */

.header {

    padding: 30px 35px;

    display: flex;

    justify-content: space-between;

    align-items: flex-start;

    border-bottom:
        1px solid #eee5e9;

}


.brand-sub {

    margin-top: 6px;

    font-size: 11px;

    color: #8b747f;

}


.invoice-title {

    text-align: right;

}


.invoice-title h1 {

    margin: 0;

    font-size: 25px;

    letter-spacing: 1px;

}


.invoice-title span {

    display: block;

    margin-top: 5px;

    font-size: 11px;

    color: #8b747f;

}


/* =====================================================
   ORDER META
===================================================== */

.meta {

    display: grid;

    grid-template-columns:
        repeat(3, 1fr);

    gap: 15px;

    padding: 20px 35px;

    background: #fff8fb;

}


.meta-item {

    padding: 10px;

}


.meta-label {

    display: block;

    margin-bottom: 5px;

    font-size: 9px;

    font-weight: 700;

    text-transform: uppercase;

    letter-spacing: .8px;

    color: #967f89;

}


.meta-value {

    font-size: 13px;

    font-weight: 700;

}


/* =====================================================
   ADDRESSES
===================================================== */

.addresses {

    display: grid;

    grid-template-columns:
        1fr 1fr;

    gap: 18px;

    padding: 28px 35px;

}


.address-card {

    padding: 18px;

    border:
        1px solid #eadfe5;

    border-radius: 12px;

}


.address-heading {

    margin-bottom: 12px;

    font-size: 10px;

    font-weight: 800;

    letter-spacing: 1px;

    color: #d6296f;

}


.address-name {

    margin-bottom: 5px;

    font-size: 14px;

    font-weight: 700;

}


.address-text {

    font-size: 12px;

    line-height: 1.55;

    color: #66555e;

}


.address-phone {

    margin-top: 7px;

    font-size: 11px;

    color: #66555e;

}


/* =====================================================
   ITEMS
===================================================== */

.items {

    padding:
        0 35px;

}


.section-title {

    margin:
        0 0 12px;

    font-size: 14px;

    font-weight: 800;

}


table {

    width: 100%;

    border-collapse: collapse;

}


thead th {

    padding: 11px 9px;

    background: #faf4f7;

    border-bottom:
        1px solid #eadfe5;

    font-size: 9px;

    text-transform: uppercase;

    letter-spacing: .6px;

    color: #7e6a73;

}


tbody td {

    padding: 14px 9px;

    border-bottom:
        1px solid #f1e9ed;

    font-size: 12px;

}


.serial {

    width: 35px;

    color: #a08b94;

}


.product-name {

    font-weight: 700;

}


.center {

    text-align: center;

}


.right {

    text-align: right;

}


.strong {

    font-weight: 700;

}


.empty {

    padding: 25px !important;

    text-align: center;

    color: #8b747f;

}


/* =====================================================
   SUMMARY
===================================================== */

.summary-wrapper {

    display: flex;

    justify-content: flex-end;

    padding:
        25px 35px;

}


.summary {

    width: 320px;

}


.summary-row {

    display: flex;

    justify-content: space-between;

    padding: 7px 0;

    font-size: 12px;

    color: #67565f;

}


.summary-row.total {

    margin-top: 8px;

    padding-top: 13px;

    border-top:
        1px solid #ded3d8;

    font-size: 16px;

    font-weight: 800;

    color: #2b2026;

}


.summary-row.total span:last-child {

    color: #d6296f;

}


/* =====================================================
   FOOTER
===================================================== */

.footer {

    padding:
        25px 35px 30px;

    text-align: center;

    border-top:
        1px solid #eee5e9;

}


.quote {

    font-size: 12px;

    font-weight: 600;

    color: #55444d;

}


.instagram {

    margin-top: 9px;

    font-size: 11px;

    font-weight: 700;

    color: #d6296f;

}


.thanks {

    margin-top: 10px;

    font-size: 10px;

    color: #9b858e;

}


/* =====================================================
   PRINT BUTTON
===================================================== */

.actions {

    display: flex;

    justify-content: flex-end;

    margin-top: 18px;

}


.print-button {

    border: none;

    border-radius: 9px;

    padding:
        11px 18px;

    background: #d6296f;

    color: white;

    font-size: 12px;

    font-weight: 700;

    cursor: pointer;

}


.print-button:hover {

    opacity: .92;

}


/* =====================================================
   MOBILE
===================================================== */

@media (max-width: 650px) {

    body {
        padding: 10px;
    }


    .header {

        flex-direction: column;

        gap: 15px;

    }


    .invoice-title {

        text-align: left;

    }


    .meta {

        grid-template-columns: 1fr;

    }


    .addresses {

        grid-template-columns: 1fr;

        padding:
            20px 15px;

    }


    .items {

        padding:
            0 15px;

        overflow-x: auto;

    }


    .summary-wrapper {

        padding:
            20px 15px;

    }


    .footer {

        padding:
            20px 15px 25px;

    }

}


/* =====================================================
   PRINT
===================================================== */

@media print {

    body {

        padding: 0;

        background: white;

    }


    .invoice {

        border: none;

        border-radius: 0;

        box-shadow: none;

    }


    .actions {

        display: none;

    }

}

.brand-wrap {

    display: flex;

    align-items: center;

    gap: 10px;

}


.invoice-logo {

    width: 42px;

    height: 42px;

    object-fit: contain;

    border-radius: 8px;

}


.brand {

    font-size: 20px;

    font-weight: 800;

    letter-spacing: .3px;

    color: #d6296f;

}


/* Premium invoice polish */
body{background:#f8f3f5!important;color:#30242a}
.invoice-page{box-shadow:0 18px 55px rgba(70,30,48,.10)!important;border:1px solid #f0e2e8!important}
.invoice-brand{letter-spacing:.6px}.invoice-title{letter-spacing:-.3px}
.invoice-section,.invoice-meta,.bill-box{border-color:#f0e2e8!important;border-radius:14px!important}
.invoice-table th{background:#fff4f8!important;color:#7d5364!important}
.invoice-table td{border-color:#f3e8ed!important}
.total-box{border-radius:15px!important;border-color:#edd8e2!important;background:linear-gradient(135deg,#fff8fb,#fff)!important}
.print-button{border-radius:10px!important;box-shadow:0 7px 18px rgba(180,35,90,.14)!important}
.print-button:hover{transform:none!important}
@media print{body{background:#fff!important}.invoice-page{box-shadow:none!important;border:none!important}}
</style>

</head>


<body>


<div class="invoice-container">


    <div class="invoice">


        <!-- HEADER -->

        <div class="header">

            <div class="brand-wrap">

    <img
        src="assets/logo.png"
        class="invoice-logo"
        alt="SS Spark Collections"
    >

    <div>

        <div class="brand">
            SS SPARK COLLECTIONS
        </div>

        <div class="brand-sub">
            Thank you for shopping with us
        </div>

    </div>

</div>


            <div class="invoice-title">

                <h1>
                    INVOICE
                </h1>

                <span>
                    Order Invoice
                </span>

            </div>

        </div>


        <!-- META -->

        <div class="meta">

            <div class="meta-item">

                <span class="meta-label">
                    Order Number
                </span>

                <div class="meta-value">
                    ${safe(
                        order.order_number
                    )}
                </div>

            </div>


            <div class="meta-item">

                <span class="meta-label">
                    Order Date
                </span>

                <div class="meta-value">
                    ${formatDate(
                        order.created_at
                    )}
                </div>

            </div>


            <div class="meta-item">

                <span class="meta-label">
                    Payment Status
                </span>

                <div class="meta-value">
                    ${safe(
                        order.payment_status ||
                        "Pending"
                    )}
                </div>

            </div>

        </div>


        <!-- ADDRESSES -->

        <div class="addresses">


            <!-- FROM -->

            <div class="address-card">

                <div class="address-heading">
                    FROM
                </div>


                <div class="address-name">
                    ${safe(fromName)}
                </div> 


                <div class="address-text">
                    ${safe(storeAddress) || "Store address not configured."}
                </div>


                ${
                    fromPhone
                        ? `
                            <div class="address-phone">
                                Phone:
                                ${safe(fromPhone)}
                            </div>
                          `
                        : ""
                }


                ${
                    fromEmail
                        ? `
                            <div class="address-phone">
                                Email:
                                ${safe(fromEmail)}
                            </div>
                          `
                        : ""
                }

            </div>


            <!-- TO -->

            <div class="address-card">

                <div class="address-heading">
                    BILL TO / SHIP TO
                </div>


                <div class="address-name">
                    ${safe(toName)}
                </div>


                <div class="address-text">

                    ${addressLine(to)}

                </div>


                ${
                    toPhone
                        ? `
                            <div class="address-phone">
                                Phone:
                                ${safe(toPhone)}
                            </div>
                          `
                        : ""
                }

            </div>


        </div>


        <!-- ITEMS -->

        <div class="items">

            <h2 class="section-title">
                Order Items
            </h2>


            <table>

                <thead>

                    <tr>

                        <th>
                            #
                        </th>

                        <th>
                            Product
                        </th>

                        <th>
                            Qty
                        </th>

                        <th class="right">
                            Price
                        </th>

                        <th class="right">
                            Total
                        </th>

                    </tr>

                </thead>


                <tbody>

                    ${itemsHtml}

                </tbody>

            </table>

        </div>


        <!-- SUMMARY -->

        <div class="summary-wrapper">

            <div class="summary">


                <div class="summary-row">

                    <span>
                        Subtotal
                    </span>

                    <span>
                        ₹${money(
                            order.subtotal
                        )}
                    </span>

                </div>


                <div class="summary-row">

                    <span>
                        Discount
                    </span>

                    <span>
                        - ₹${money(
                            order.discount_amount
                        )}
                    </span>

                </div>


                <div class="summary-row">

                    <span>
                        Shipping
                    </span>

                    <span>
                        ₹${money(
                            order.shipping_amount
                        )}
                    </span>

                </div>


                <div class="summary-row total">

                    <span>
                        Grand Total
                    </span>

                    <span>
                        ₹${money(
                            order.total_amount
                        )}
                    </span>

                </div>


            </div>

        </div>


        <!-- FOOTER -->

        <div class="footer">

            <div class="quote">
                Made with care.
                Packed with love.
                Delivered to you.
            </div>


            <div class="instagram">
                Follow us on Instagram
                · @sssparkcollection
            </div>


            <div class="thanks">
                Thank you for choosing
                SS SPARK COLLECTIONS ❤️
            </div>

        </div>


    </div>


    <!-- ACTION -->

    <div class="actions">

        <button
            type="button"
            class="print-button"
            onclick="window.print()"
        >
            🖨 Print / Save as PDF
        </button>

    </div>


</div>


</body>

</html>

    `);

    invoiceWindow.document.close();

}