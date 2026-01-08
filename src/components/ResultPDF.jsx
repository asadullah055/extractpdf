import {
    Document,
    Font,
    Page,
    StyleSheet,
    Text,
    View,
} from "@react-pdf/renderer";

/* ================= FONT REGISTRATION ================= */

// Option 1: Google Fonts CDN (সবচেয়ে নির্ভরযোগ্য)
Font.register({
    family: "Amiri",
    fonts: [
        {
            src: "/fonts/Amiri-Regular.ttf",
            fontWeight: "normal"
        },
        {
            src: "/fonts/Amiri-Regular.ttf",
            fontWeight: "bold"
        },
    ],
});

// Disable hyphenation for Arabic text
Font.registerHyphenationCallback((word) => [word]);

/* ================= HELPERS ================= */

// Clean and fix Arabic text with numbers
const fixArabicText = (text) => {
    if (!text) return "";

    // Remove problematic zero-width characters
    let cleaned = text
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/\u00A0/g, " ");

    // Wrap numbers and symbols in LTR marks for correct display
    cleaned = cleaned.replace(
        /([0-9]+(?:[\/\-\.\s][0-9]+)*)/g,
        "\u200E$1\u200E"
    );

    // Fix phone numbers and special formats
    cleaned = cleaned.replace(
        /(\+?[0-9\s\-\(\)]{6,})/g,
        "\u200E$1\u200E"
    );

    return cleaned;
};

// Extract email from text
const extractEmail = (text) => {
    if (!text) return null;
    const match = text.match(
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
    );
    return match ? match[0] : null;
};

// Split "label: value" for dates and similar fields
const splitLabelValue = (line) => {
    const idx = line.indexOf(":");
    if (idx === -1) return null;
    return {
        label: line.slice(0, idx).trim(),
        value: line.slice(idx + 1).trim(),
    };
};

/* ================= STYLES ================= */
const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontFamily: "Amiri",
        direction: "rtl",
        backgroundColor: "#F9FAFB",
    },

    /* MAIN TITLE */
    titleBox: {
        backgroundColor: "#047857",
        padding: 12,
        borderRadius: 6,
        marginBottom: 10,
    },
    title: {
        fontSize: 18,
        color: "#FFFFFF",
        textAlign: "center",
        fontWeight: "bold",
    },

    /* SECTIONS */
    section: {
        marginBottom: 10,
    },

    headingBox: {
        backgroundColor: "#ECFDF5",
        borderRightWidth: 4,
        borderRightColor: "#047857",
        paddingVertical: 6,
        paddingHorizontal: 10,
        marginBottom: 6,
    },
    heading: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#065F46",
        textAlign: "right",
    },

    /* TEXT STYLES */
    text: {
        fontSize: 12,
        lineHeight: 1.8,
        color: "#111827",
        textAlign: "right",
    },

    boldText: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#111827",
        textAlign: "right",
        marginBottom: 2,
    },

    ltrText: {
        direction: "ltr",
        textAlign: "left",
    },

    bullet: {
        marginBottom: 5,
        paddingRight: 10,
    },

    bulletRow: {
        flexDirection: "row-reverse",
        alignItems: "flex-start",
        marginBottom: 6,
    },

    bulletPoint: {
        fontSize: 12,
        color: "#047857",
        marginLeft: 6,
    },

    bulletContent: {
        flex: 1,
    },

    /* LABEL-VALUE PAIRS */
    labelValueRow: {
        flexDirection: "row-reverse",
        marginBottom: 8,
        alignItems: "flex-start",
    },
    label: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#374151",
        marginLeft: 8,
        textAlign: "right",
    },
    value: {
        fontSize: 12,
        color: "#111827",
        flex: 1,
        textAlign: "right",
    },

    /* CONTACT SECTION */
    contactTitleBox: {
        backgroundColor: "#ECFDF5",
        borderRightWidth: 4,
        borderRightColor: "#047857",
        padding: 8,
        marginTop: 10,
        marginBottom: 6,
    },
    contactTitle: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#065F46",
        textAlign: "right",
    },

    /* TABLE */
    table: {
        borderWidth: 1,
        borderColor: "#D1D5DB",
        marginTop: 6,
        marginBottom: 12,
    },
    row: {
        flexDirection: "row-reverse",
        borderBottomWidth: 1,
        borderBottomColor: "#D1D5DB",

    },
    rowLast: {
        borderBottomWidth: 0,
    },
    rowAlt: {
        backgroundColor: "#F3F4F6",
    },
    cellHeader: {
        flex: 1,
        padding: 8,
        fontSize: 11,
        fontWeight: "bold",
        backgroundColor: "#E5E7EB",
        borderLeftWidth: 1,
        borderLeftColor: "#D1D5DB",
        textAlign: "center",
        color: "#000000",
    },
    cellHeaderLast: {
        borderLeftWidth: 0,
    },
    cell: {
        flex: 1,
        padding: 8,
        fontSize: 12,
        borderLeftWidth: 1,
        borderLeftColor: "#D1D5DB",
        textAlign: "center",
        color: "#111827",
    },
    cellLast: {
        borderLeftWidth: 0,
    },

    /* FOOTER */

});

/* ================= CONTACT PARSER ================= */
const parseContacts = (lines) => {
    const contacts = [];
    let current = {};
    let inContactSection = false;

    lines.forEach((line) => {
        const t = line.trim();

        // Start of contact section
        if (t.includes("بيانات منسقي الاتصال")) {
            inContactSection = true;
            return;
        }

        // End of contact section (next heading)
        if (inContactSection && t.startsWith("#") && !t.includes("بيانات منسقي")) {
            inContactSection = false;
            if (Object.keys(current).length) {
                contacts.push(current);
                current = {};
            }
            return;
        }

        if (!inContactSection) return;
        if (!t) return;

        if (t.startsWith("الاسم:") || t.includes("الاسم :")) {
            if (Object.keys(current).length) contacts.push(current);
            current = { name: t.replace(/الاسم\s*:/, "").trim() };
            return;
        }

        if (t.startsWith("الجهة:") || t.includes("الجهة :")) {
            current.org = t.replace(/الجهة\s*:/, "").trim();
            return;
        }

        if (t.startsWith("الصفة") || t.includes("الصفة")) {
            const parts = t.split(":");
            if (parts[1]) {
                current.role = parts[1].trim();
            }
            return;
        }

        if (t.includes("البريد") || t.includes("@")) {
            const email = extractEmail(t);
            if (email) {
                current.email = email;
            }
            return;
        }

        if (t.startsWith("رقم الهاتف") || t.includes("الهاتف")) {
            current.phone = t.replace(/رقم الهاتف\s*:/, "").replace(/الهاتف\s*:/, "").trim();
            return;
        }
    });

    if (Object.keys(current).length) contacts.push(current);
    return contacts;
};

/* ================= CHECK IF LINE IS CONTACT DATA ================= */
const isContactLine = (line) => {
    const t = line.trim();
    return (
        t.startsWith("الاسم:") ||
        t.includes("الاسم :") ||
        t.startsWith("الجهة:") ||
        t.includes("الجهة :") ||
        t.startsWith("الصفة") ||
        t.startsWith("رقم الهاتف") ||
        t.includes("الهاتف:") ||
        (t.includes("البريد") && t.includes("@")) ||
        (t.includes("@") && t.includes("."))
    );
};

/* ================= MAIN COMPONENT ================= */
export default function ResultPDF({ text }) {
    // Pre-process text
    const cleanedText = fixArabicText(text);
    const lines = cleanedText.split("\n");
    const contacts = parseContacts(lines);

    // Track if we're in contact section to skip raw lines
    let inContactSection = false;
    let contactSectionRendered = false;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* MAIN TITLE */}
                <View style={styles.titleBox}>
                    <Text style={styles.title}>مذكرة التفاهم</Text>
                </View>

                {lines.map((line, i) => {
                    const trimmed = line.trim();

                    // Skip empty lines
                    if (!trimmed) return null;

                    /* ===== CONTACT SECTION HANDLING ===== */
                    if (trimmed.startsWith("#") && trimmed.includes("بيانات منسقي الاتصال")) {
                        inContactSection = true;

                        // Only render once
                        if (contactSectionRendered) return null;
                        contactSectionRendered = true;

                        return (
                            <View key={i} style={styles.section}>
                                {/* Section Title */}
                                <View style={styles.contactTitleBox}>
                                    <Text style={styles.contactTitle}>
                                        بيانات منسقي الاتصال
                                    </Text>
                                </View>

                                {/* Contact Table */}
                                {contacts.length > 0 && (
                                    <View style={styles.table}>
                                        {/* Header Row */}
                                        <View style={styles.row}>
                                            <Text style={styles.cellHeader}>الاسم</Text>
                                            <Text style={styles.cellHeader}>الجهة</Text>
                                            <Text style={styles.cellHeader}>الصفة</Text>
                                            <Text style={styles.cellHeader}>البريد الإلكتروني</Text>
                                            <Text style={[styles.cellHeader, styles.cellHeaderLast]}>الهاتف</Text>
                                        </View>

                                        {/* Data Rows */}
                                        {contacts.map((c, idx) => (
                                            <View
                                                key={idx}
                                                style={[
                                                    styles.row,
                                                    idx % 2 === 1 && styles.rowAlt,
                                                    idx === contacts.length - 1 && styles.rowLast,
                                                ]}
                                            >
                                                <Text style={styles.cell}>
                                                    {c.name || "-"}
                                                </Text>
                                                <Text style={styles.cell}>
                                                    {c.org || "-"}
                                                </Text>
                                                <Text style={styles.cell}>
                                                    {c.role || "-"}
                                                </Text>
                                                <Text style={[styles.cell, styles.ltrText]}>
                                                    {c.email || "-"}
                                                </Text>
                                                <Text style={[styles.cell, styles.cellLast, styles.ltrText]}>
                                                    {c.phone || "-"}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        );
                    }

                    // Check if we're exiting contact section
                    if (inContactSection && trimmed.startsWith("#")) {
                        inContactSection = false;
                    }

                    // Skip raw contact data lines
                    if (inContactSection || isContactLine(trimmed)) {
                        return null;
                    }

                    /* ===== SECTION HEADINGS ===== */
                    if (trimmed.startsWith("#")) {
                        const headingText = trimmed.replace(/^#+\s*/, "").trim();
                        return (
                            <View key={i} style={styles.section}>
                                <View style={styles.headingBox}>
                                    <Text style={styles.heading}>{headingText}</Text>
                                </View>
                            </View>
                        );
                    }

                    /* ===== BULLET POINTS ===== */
                    if (trimmed.startsWith("-") || trimmed.startsWith("•")) {
                        const content = trimmed.replace(/^[-•]\s*/, "").trim();
                        const pair = splitLabelValue(content);

                        // Label: Value format (like dates)
                        if (pair && pair.label && pair.value) {
                            return (
                                <View key={i} style={styles.labelValueRow}>
                                    <Text style={styles.label}>:{pair.label}</Text>
                                    <Text style={styles.value}>{pair.value}</Text>
                                </View>
                            );
                        }

                        // Regular bullet point
                        return (
                            <View key={i} style={styles.bulletRow}>
                                <Text style={styles.bulletPoint}>•</Text>
                                <View style={styles.bulletContent}>
                                    <Text style={styles.text}>{content}</Text>
                                </View>
                            </View>
                        );
                    }

                    /* ===== NUMBERED LISTS ===== */
                    if (/^[0-9]+[\.)\-]/.test(trimmed)) {
                        const content = trimmed.replace(/^[0-9]+[\.)\-]\s*/, "").trim();
                        const number = trimmed.match(/^[0-9]+/)[0];

                        return (
                            <View key={i} style={styles.bulletRow}>
                                <Text style={styles.bulletPoint}>{number}.</Text>
                                <View style={styles.bulletContent}>
                                    <Text style={styles.text}>{content}</Text>
                                </View>
                            </View>
                        );
                    }

                    /* ===== NORMAL TEXT ===== */
                    return (
                        <View key={i} style={styles.section}>
                            <Text style={styles.text}>{trimmed}</Text>
                        </View>
                    );
                })}


            </Page>
        </Document>
    );
}