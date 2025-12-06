import React, { useState, useEffect } from "react";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Phone,
  MapPin,
  ChefHat,
  Clock,
  X,
  MessageCircle,
  Lock,
  Edit2,
  Save,
  UploadCloud,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  KeyRound,
  LogOut,
  Image as ImageIcon,
  Camera,
  Eye,
  ArrowRight,
  StickyNote,
  Bike,
  Store,
  Utensils,
  Banknote,
  Smartphone,
  Bitcoin,
  Sparkles,
  Bot,
  Search,
  ExternalLink,
  Settings,
  ToggleRight,
  TicketPercent,
} from "lucide-react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  signInWithCustomToken,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";

// --- CONFIGURACIÓN GENERAL ---
const NUMERO_WHATSAPP = "573144709786";
const ENLACE_TIKTOK = "https://www.tiktok.com/@fundidos.par";
const apiKey = "";

// --- CONFIGURACIÓN FIREBASE ---
const YOUR_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCK1M_aGt2RoJm-QdAHNHIX9X_t3lQIfds",
  authDomain: "burguerapp-b6cc1.firebaseapp.com",
  projectId: "burguerapp-b6cc1",
  storageBucket: "burguerapp-b6cc1.firebasestorage.app",
  messagingSenderId: "1072944343304",
  appId: "1:1072944343304:web:a6a6781f0c2f16e29fa4bd",
};

// --- LISTA MAESTRA DE CATEGORÍAS ---
const CATEGORIES_LIST = [
  "Hamburguesas",
  "Hamburguesas Solas (sin papas)",
  "Hamburguesas con Papas",
  "Perros Calientes",
  "Papasfundi",
  "Ensaladas",
  "Acompañamientos",
  "Postres",
  "Bebidas",
  "Extras",
  "Promociones",
  "Promo en Divisa",
];

// --- ETIQUETAS ---
const BADGES_LIST = [
  { label: "Sin etiqueta", value: "" },
  { label: "🔥 Más Vendido", value: "best_seller", color: "bg-orange-500" },
  { label: "🆕 Nuevo", value: "new", color: "bg-blue-500" },
  { label: "🌶️ Picante", value: "spicy", color: "bg-red-600" },
  { label: "💎 Premium", value: "premium", color: "bg-purple-600" },
  { label: "📉 Oferta", value: "sale", color: "bg-green-600" },
];

// --- DATOS INICIALES ---
const INITIAL_MENU_ITEMS = [
  {
    id: "1",
    name: "La Clásica",
    description: "Carne 150g, queso cheddar, lechuga, tomate y salsa especial.",
    price: 19000,
    category: "Hamburguesas",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60",
    badge: "best_seller",
  },
  {
    id: "2",
    name: "Fundiburguer",
    description:
      "La especialidad de la casa. ¡Elige tu proteína y báñala en salsa!",
    price: 26000,
    category: "Hamburguesas",
    image:
      "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=500&auto=format&fit=crop&q=60",
    badge: "premium",
  },
];

// --- GESTIÓN DB ---
let db = null;
let auth = null;
let useFirebase = false;
let collectionRef = null;
let settingsRef = null;
let couponsRef = null;

try {
  if (YOUR_FIREBASE_CONFIG.apiKey.length > 0) {
    const app = initializeApp(YOUR_FIREBASE_CONFIG);
    auth = getAuth(app);
    db = getFirestore(app);
    useFirebase = true;
    collectionRef = collection(db, "menu");
    settingsRef = doc(db, "config", "store_settings");
    couponsRef = collection(db, "coupons");
  } else if (typeof __firebase_config !== "undefined") {
    const firebaseConfig = JSON.parse(__firebase_config);
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
    useFirebase = true;
    collectionRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "menu_items"
    );
    settingsRef = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "store_settings",
      "config"
    );
    couponsRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "coupons"
    );
  }
} catch (e) {
  console.log("Modo local activo");
}

export default function App() {
  const [user, setUser] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    address: "",
    phone: "",
  });

  // View State
  const [view, setView] = useState("landing");
  const [activeCategory, setActiveCategory] = useState("Todas");

  // Admin & Auth State
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState({
    name: "",
    price: "",
    category: "Hamburguesas",
    description: "",
    image: "",
    badge: "",
    upsell: false,
  });
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Cupones
  const [showCouponsModal, setShowCouponsModal] = useState(false);
  const [couponsList, setCouponsList] = useState([]);
  const [newCoupon, setNewCoupon] = useState({ code: "", discount: 10 });

  // Security
  const [showLogin, setShowLogin] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const ADMIN_PASSWORD = "1234";

  // Product Modal State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [productNote, setProductNote] = useState("");
  const [fundiOptions, setFundiOptions] = useState({ proteina: "", salsa: "" });

  // Estado para Extras seleccionados en el modal
  const [selectedExtras, setSelectedExtras] = useState([]);

  // Order State
  const [orderType, setOrderType] = useState("delivery");
  const [paymentMethod, setPaymentMethod] = useState("Efectivo");
  const [cartStep, setCartStep] = useState("list");

  // Cupones Carrito
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponMessage, setCouponMessage] = useState({ type: "", text: "" });

  // AI & Search & Store State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiGeneratingDesc, setAiGeneratingDesc] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [storeSchedule, setStoreSchedule] = useState({ open: 11, close: 23 });
  const [isStoreOpen, setIsStoreOpen] = useState(true);

  const [showUpsellModal, setShowUpsellModal] = useState(false);

  // --- VARIABLES DERIVADAS (Definidas aquí para evitar errores) ---
  const categories = [
    "Todas",
    ...new Set(
      menuItems.map((item) => String(item.category || "Sin Categoría"))
    ),
  ];

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory =
      activeCategory === "Todas" || item.category === activeCategory;
    const query = searchQuery.toLowerCase();
    const itemName = String(item.name || "").toLowerCase();
    const itemDesc = String(item.description || "").toLowerCase();
    const matchesSearch = itemName.includes(query) || itemDesc.includes(query);
    return matchesCategory && matchesSearch;
  });

  const sideItems = menuItems.filter((i) => i.category === "Acompañamientos");
  const drinkItems = menuItems.filter((i) => i.category === "Bebidas");
  const saladItems = menuItems.filter((i) => i.category === "Ensaladas");
  const dessertItems = menuItems.filter((i) => i.category === "Postres");
  const hotdogItems = menuItems.filter(
    (i) => i.category === "Perros Calientes"
  );

  const extrasTotal = selectedExtras.reduce(
    (sum, e) => sum + Number(e.price || 0),
    0
  );
  const currentModalTotal =
    (selectedProduct ? Number(selectedProduct.price || 0) * quantity : 0) +
    extrasTotal;

  const subTotal = cart.reduce(
    (sum, item) => sum + Number(item.price || 0) * item.quantity,
    0
  );
  const discountAmount = appliedCoupon
    ? (subTotal * appliedCoupon.discount) / 100
    : 0;
  const total = subTotal - discountAmount;
  const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
  const formatPrice = (price) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(price);

  // --- EFECTOS ---
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.tailwindcss.com";
    script.async = true;
    document.head.appendChild(script);

    // Reloj de la tienda
    const checkSchedule = () => {
      const hour = new Date().getHours();
      const open = Number(storeSchedule?.open || 11);
      const close = Number(storeSchedule?.close || 23);

      if (hour < open || hour >= close) {
        setIsStoreOpen(false);
      } else {
        setIsStoreOpen(true);
      }
    };
    checkSchedule();
    const interval = setInterval(checkSchedule, 60000);

    const initApp = async () => {
      if (useFirebase && auth) {
        try {
          if (
            typeof __initial_auth_token !== "undefined" &&
            __initial_auth_token &&
            !YOUR_FIREBASE_CONFIG.apiKey
          ) {
            await signInWithCustomToken(auth, __initial_auth_token);
          } else {
            await signInAnonymously(auth);
          }
        } catch (error) {
          if (
            error.code === "auth/configuration-not-found" ||
            error.code === "auth/operation-not-allowed"
          ) {
            setAuthError("needs_setup");
          } else {
            setAuthError(error.code);
          }
          setUser({ uid: "local-user" });
          loadLocalData();
          return;
        }

        const unsubscribe = onAuthStateChanged(auth, (u) => {
          if (u) {
            setUser(u);
            if (collectionRef) {
              onSnapshot(
                collectionRef,
                (snapshot) => {
                  const items = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                  }));
                  setMenuItems(items);
                },
                (err) => {
                  console.error("Error DB", err);
                  loadLocalData();
                }
              );
            }
            if (settingsRef) {
              onSnapshot(settingsRef, (doc) => {
                if (doc.exists()) {
                  const data = doc.data();
                  // Validación extra para evitar errores
                  if (
                    data &&
                    typeof data.open === "number" &&
                    typeof data.close === "number"
                  ) {
                    setStoreSchedule(data);
                  }
                }
              });
            }
            if (couponsRef) {
              onSnapshot(couponsRef, (snapshot) => {
                const coupons = snapshot.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                }));
                setCouponsList(coupons);
              });
            }
          } else {
            setUser(null);
          }
        });
        return () => unsubscribe();
      } else {
        setUser({ uid: "local-user" });
        loadLocalData();
      }
    };
    initApp();
    return () => clearInterval(interval);
  }, [storeSchedule.open, storeSchedule.close]);

  const loadLocalData = () => {
    const savedMenu = localStorage.getItem("burger_menu_items");
    if (savedMenu) setMenuItems(JSON.parse(savedMenu));
    else setMenuItems([]);
  };

  useEffect(() => {
    if (searchQuery.length > 0) {
      setActiveCategory("Todas");
    }
  }, [searchQuery]);

  // --- FUNCIONES IA ---
  const askTheChef = async () => {
    if (!aiQuery.trim()) return;
    setIsAiLoading(true);
    setAiResponse("");
    const menuContext = menuItems
      .map((i) => `${i.name}: ${i.description} ($${i.price})`)
      .join("\n");
    const prompt = `Eres un experto chef de hamburguesas divertido y servicial. Tienes este menú disponible:\n${menuContext}\n\nUn cliente te dice: "${aiQuery}".\n\nRecomienda UNA sola opción del menú que mejor se adapte a lo que pide y explica por qué en máximo 2 frases. Sé entusiasta. Si no sabes qué recomendar, sugiere la "Fundiburguer".`;
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );
      const data = await response.json();
      setAiResponse(
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
          "Lo siento, me quedé sin ideas. ¡Prueba la Fundiburguer!"
      );
    } catch (error) {
      setAiResponse(
        "El chef está ocupado en este momento. ¡Pero todo es delicioso!"
      );
    } finally {
      setIsAiLoading(false);
    }
  };

  const generateDescription = async () => {
    if (!newItem.name) {
      alert("Escribe el nombre del producto primero.");
      return;
    }
    setAiGeneratingDesc(true);
    const prompt = `Escribe una descripción corta, apetitosa y vendedora (máximo 150 caracteres) para un producto de comida rápida llamado "${newItem.name}" de la categoría "${newItem.category}". Usa emojis.`;
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) setNewItem((prev) => ({ ...prev, description: text }));
    } catch (error) {
      alert("Error conectando con la IA creativa.");
    } finally {
      setAiGeneratingDesc(false);
    }
  };

  // --- HELPERS VISUALES ---
  const getCategoryStyle = (catName) => {
    const name = String(catName || "").toLowerCase();
    if (name.includes("hamburguesa"))
      return { bg: "bg-orange-500", text: "text-white", icon: "🍔" };
    if (name.includes("bebida"))
      return { bg: "bg-blue-500", text: "text-white", icon: "🥤" };
    if (
      name.includes("papa") ||
      name.includes("acompañamiento") ||
      name.includes("extra")
    )
      return { bg: "bg-yellow-500", text: "text-white", icon: "🍟" };
    if (name.includes("perro"))
      return { bg: "bg-red-600", text: "text-white", icon: "🌭" };
    if (name.includes("ensalada"))
      return { bg: "bg-green-500", text: "text-white", icon: "🥗" };
    if (name.includes("postre"))
      return { bg: "bg-pink-500", text: "text-white", icon: "🍰" };
    if (name.includes("promo"))
      return { bg: "bg-purple-600", text: "text-white", icon: "🏷️" };
    return { bg: "bg-gray-500", text: "text-white", icon: "🍽️" };
  };

  const renderBadge = (val) => {
    const b = BADGES_LIST.find((x) => x.value === val);
    return b && b.value ? (
      <span
        className={`absolute top-2 left-2 z-10 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm ${b.color}`}
      >
        {b.label}
      </span>
    ) : null;
  };

  // --- HELPERS DB ---
  const saveDataLocal = (items) => {
    setMenuItems(items);
    localStorage.setItem("burger_menu_items", JSON.stringify(items));
  };
  const isFirebaseReady = () =>
    useFirebase &&
    user &&
    user.uid !== "local-user" &&
    collectionRef &&
    !authError;

  const dbAction = async (action, payload) => {
    if (isFirebaseReady()) {
      try {
        let ref;
        if (YOUR_FIREBASE_CONFIG.apiKey.length > 0) {
          ref = action === "add" ? collectionRef : doc(db, "menu", payload.id);
        } else {
          const appId =
            typeof __app_id !== "undefined" ? __app_id : "default-app-id";
          ref =
            action === "add"
              ? collectionRef
              : doc(
                  db,
                  "artifacts",
                  appId,
                  "public",
                  "data",
                  "menu_items",
                  payload.id
                );
        }

        if (action === "add") await addDoc(ref, payload);
        if (action === "update") await updateDoc(ref, payload);
        if (action === "delete") await deleteDoc(ref);
      } catch (e) {
        alert("Error en base de datos.");
      }
    } else {
      let newItems = [...menuItems];
      if (action === "add")
        newItems.push({ ...payload, id: Date.now().toString() });
      if (action === "update")
        newItems = newItems.map((i) => (i.id === payload.id ? payload : i));
      if (action === "delete")
        newItems = newItems.filter((i) => i.id !== payload);
      saveDataLocal(newItems);
    }
  };

  const saveSchedule = async () => {
    if (isFirebaseReady() && settingsRef) {
      try {
        await setDoc(settingsRef, storeSchedule);
        alert("Horario actualizado");
        setShowSettingsModal(false);
      } catch (e) {
        alert("Error guardando horario");
      }
    } else {
      alert("No se puede guardar en modo local");
    }
  };

  const handleAddCoupon = async () => {
    if (!newCoupon.code || !newCoupon.discount) return;
    if (isFirebaseReady() && couponsRef) {
      await addDoc(couponsRef, {
        ...newCoupon,
        code: newCoupon.code.toUpperCase(),
      });
      setNewCoupon({ code: "", discount: 10 });
    }
  };

  const handleDeleteCoupon = async (id) => {
    if (isFirebaseReady() && couponsRef) {
      let ref;
      if (YOUR_FIREBASE_CONFIG.apiKey.length > 0) {
        ref = doc(db, "coupons", id);
      } else {
        const appId =
          typeof __app_id !== "undefined" ? __app_id : "default-app-id";
        ref = doc(db, "artifacts", appId, "public", "data", "coupons", id);
      }
      await deleteDoc(ref);
    }
  };

  const applyCoupon = () => {
    const inputCode = couponInput.toUpperCase().trim();
    const found = couponsList.find((c) => c.code === inputCode);
    if (found) {
      setAppliedCoupon(found);
      setCouponMessage({
        type: "success",
        text: `¡Cupón de ${found.discount}% aplicado!`,
      });
    } else {
      setAppliedCoupon(null);
      setCouponMessage({ type: "error", text: "Cupón no válido" });
    }
  };

  const seedDatabase = async () => {
    if (isFirebaseReady()) {
      for (const item of INITIAL_MENU_ITEMS) {
        const { id, ...data } = item;
        await addDoc(collectionRef, data);
      }
    } else {
      saveDataLocal(INITIAL_MENU_ITEMS);
    }
  };

  const handleImageSelect = (e, isEdit = false) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 800 * 1024) {
        alert("⚠️ Imagen muy pesada. Max 800KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isEdit) setEditingItem({ ...editingItem, image: reader.result });
        else setNewItem({ ...newItem, image: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdminToggle = () => {
    if (isAdminMode) setIsAdminMode(false);
    else {
      setShowLogin(true);
      setLoginPassword("");
    }
  };
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (loginPassword === ADMIN_PASSWORD) {
      setIsAdminMode(true);
      setShowLogin(false);
    } else {
      alert("Incorrecto");
      setLoginPassword("");
    }
  };

  const handleAddNew = async (e) => {
    e.preventDefault();
    await dbAction("add", { ...newItem, price: Number(newItem.price) });
    setNewItem({
      name: "",
      price: "",
      category: "Hamburguesas",
      description: "",
      image: "",
      badge: "",
      upsell: false,
    });
    setIsAddingNew(false);
  };
  const handleSaveEdit = async (item) => {
    await dbAction("update", item);
    setEditingItem(null);
  };
  const handleDeleteItem = async (id) => {
    if (confirm("¿Borrar?")) await dbAction("delete", id);
  };

  const openProductModal = (item) => {
    setSelectedProduct(item);
    setQuantity(1);
    setProductNote("");
    setFundiOptions({ proteina: "", salsa: "" });
    setSelectedExtras([]); // Reset extras
  };

  const isProductValid = (item) =>
    item.name !== "Fundiburguer" ||
    (fundiOptions.proteina && fundiOptions.salsa);

  const toggleExtra = (extraItem) => {
    if (selectedExtras.find((e) => e.id === extraItem.id)) {
      setSelectedExtras((prev) => prev.filter((e) => e.id !== extraItem.id));
    } else {
      setSelectedExtras((prev) => [...prev, extraItem]);
    }
  };

  const addAllToCart = () => {
    if (!isProductValid(selectedProduct)) {
      alert("Selecciona Proteína y Salsa.");
      return;
    }
    addToCart(selectedProduct, quantity, productNote);
    selectedExtras.forEach((extra) => {
      addToCart(extra, 1, `Extra para ${selectedProduct.name}`);
    });
    setSelectedProduct(null);
  };

  const addToCart = (item, qty, note) => {
    let finalNote = note;
    if (item.name === "Fundiburguer")
      finalNote = `(Proteína: ${fundiOptions.proteina}, Salsa: ${
        fundiOptions.salsa
      }) ${note ? ". " + note : ""}`;

    setCart((prev) => {
      if (item.name === "Fundiburguer")
        return [
          ...prev,
          {
            ...item,
            quantity: qty,
            note: finalNote,
            id: Date.now(),
            upsell: item.upsell,
          },
        ];
      const existing = prev.find((i) => i.id === item.id);
      if (existing)
        return prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                quantity: i.quantity + qty,
                note: finalNote
                  ? i.note
                    ? `${i.note}, ${finalNote}`
                    : finalNote
                  : i.note,
              }
            : i
        );
      return [
        ...prev,
        { ...item, quantity: qty, note: finalNote, upsell: item.upsell },
      ];
    });
  };

  const removeFromCart = (itemId) =>
    setCart((prev) => prev.filter((item) => item.id !== itemId));
  const updateQuantity = (itemId, change) =>
    setCart((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, quantity: Math.max(1, item.quantity + change) }
          : item
      )
    );

  const sendToWhatsApp = (finalCart) => {
    let typeTitle =
      orderType === "pickup"
        ? "🥡 *PARA RECOGER*"
        : orderType === "table"
        ? "🍽️ *EN MESA*"
        : "🛵 *A DOMICILIO*";
    let message = `Hola, soy *${customerInfo.name}* y quiero hacer un pedido ${typeTitle}:\n\n`;
    let cartTotal = 0;
    finalCart.forEach((item) => {
      const itemSub = item.price * item.quantity;
      cartTotal += itemSub;
      message += `▪️ ${item.quantity}x ${item.name} - ${formatPrice(
        itemSub
      )}\n${item.note ? `   📝 ${item.note}\n` : ""}`;
    });
    if (appliedCoupon) {
      message += `\nSubtotal: ${formatPrice(cartTotal)}`;
      message += `\n🎟️ Cupón ${appliedCoupon.code}: -${appliedCoupon.discount}%`;
      message += `\n*TOTAL FINAL: ${formatPrice(
        cartTotal - (cartTotal * appliedCoupon.discount) / 100
      )}*\n`;
    } else {
      message += `\n*TOTAL: ${formatPrice(cartTotal)}*\n`;
    }
    message += `💳 Pago: *${paymentMethod}*\n`;
    if (orderType === "delivery")
      message += `\n📍 Dirección: ${customerInfo.address}`;
    if (orderType === "table") message += `\n🪑 Mesa: ${customerInfo.address}`;
    message += `\n📱 Tel: ${customerInfo.phone}`;
    window.open(
      `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
    setCart([]);
    setView("success");
    setIsCartOpen(false);
    setCartStep("list");
    setShowUpsellModal(false);
    setAppliedCoupon(null);
    setCouponInput("");
  };

  const handleCheckout = (e) => {
    e.preventDefault();
    const hasUpsellProduct = cart.some((item) => item.upsell === true);
    const hasFriesAlready = cart.some((item) =>
      String(item.name).toLowerCase().includes("papa")
    );
    if (hasUpsellProduct && !hasFriesAlready) setShowUpsellModal(true);
    else sendToWhatsApp(cart);
  };

  const handleAcceptUpsell = () => {
    const papasExtra = {
      id: "papas-upsell-" + Date.now(),
      name: "Porción de Papas (Extra)",
      price: 5000,
      quantity: 1,
      category: "Acompañamientos",
    };
    const newCart = [...cart, papasExtra];
    setCart(newCart);
    sendToWhatsApp(newCart);
  };

  const handleOpenCart = () => {
    setIsCartOpen(true);
    setCartStep("list");
  };

  if (view === "landing") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-red-100 to-white flex flex-col items-center justify-center p-6 animate-fade-in">
        <div className="text-center mb-10 scale-110">
          <div className="bg-yellow-400 p-6 rounded-full inline-block shadow-xl mb-4 border-4 border-white">
            <ChefHat size={64} className="text-red-700" />
          </div>
          <h1 className="text-4xl font-black text-red-600 tracking-tight drop-shadow-sm">
            @Fundidos.par
          </h1>
          <p className="text-lg font-bold text-gray-700 mt-2 tracking-widest">
            SENCILLAMENTE ADICTIVO
          </p>
        </div>
        <div className="w-full max-w-sm space-y-4">
          <button
            onClick={() => setView("menu")}
            className="w-full bg-white hover:bg-red-50 text-gray-800 font-bold py-4 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-between px-6 border border-gray-100 group"
          >
            <span className="flex items-center gap-3">
              <Smartphone className="text-red-500" /> Realiza tu pedido
            </span>
            <ArrowRight className="text-gray-300 group-hover:text-red-500 transition-colors" />
          </button>
          <button
            onClick={() =>
              window.open(`https://wa.me/${NUMERO_WHATSAPP}`, "_blank")
            }
            className="w-full bg-white hover:bg-green-50 text-gray-800 font-bold py-4 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-between px-6 border border-gray-100 group"
          >
            <span className="flex items-center gap-3">
              <MessageCircle className="text-green-500" /> WhatsApp
            </span>
            <ExternalLink
              className="text-gray-300 group-hover:text-green-500 transition-colors"
              size={20}
            />
          </button>
          <button
            onClick={() => window.open(ENLACE_TIKTOK, "_blank")}
            className="w-full bg-white hover:bg-gray-50 text-gray-800 font-bold py-4 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-between px-6 border border-gray-100 group"
          >
            <span className="flex items-center gap-3">
              <span className="bg-black text-white rounded-full p-1 text-[10px] font-bold">
                Tk
              </span>{" "}
              TikTok
            </span>
            <ExternalLink
              className="text-gray-300 group-hover:text-black transition-colors"
              size={20}
            />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-20">
      {showUpsellModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in zoom-in">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl border-4 border-yellow-400 relative">
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-yellow-400 p-3 rounded-full shadow-lg">
              <span className="text-4xl">🍟</span>
            </div>
            <h3 className="text-xl font-black text-gray-800 mt-6 mb-2">
              ¿Te olvidas de algo?
            </h3>
            <p className="text-gray-600 mb-6">
              La hamburguesa no sabe igual sin papas. <br />
              <span className="font-bold text-red-600">
                ¿Agregamos una porción por solo $5.000?
              </span>
            </p>
            <div className="space-y-3">
              <button
                onClick={handleAcceptUpsell}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-red-900 font-black py-3 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
              >
                <Plus size={24} /> ¡SÍ, AGREGAR PAPAS!
              </button>
              <button
                onClick={() => sendToWhatsApp(cart)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold py-3 rounded-xl transition-colors"
              >
                No, gracias, así está bien
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl w-full max-w-xs p-5 shadow-2xl">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Settings size={20} /> Configuración
            </h3>
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">
                  Horario
                </h4>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Apertura (0-23)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      className="border w-full p-2 rounded"
                      value={storeSchedule.open}
                      onChange={(e) =>
                        setStoreSchedule({
                          ...storeSchedule,
                          open: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Cierre (0-23)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      className="border w-full p-2 rounded"
                      value={storeSchedule.close}
                      onChange={(e) =>
                        setStoreSchedule({
                          ...storeSchedule,
                          close: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <button
                    onClick={saveSchedule}
                    className="w-full bg-blue-600 py-2 rounded font-bold text-white text-xs"
                  >
                    Guardar Horario
                  </button>
                </div>
              </div>
              <div className="border-t pt-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">
                  Gestionar Cupones
                </h4>
                <button
                  onClick={() => {
                    setShowSettingsModal(false);
                    setShowCouponsModal(true);
                  }}
                  className="w-full bg-orange-100 text-orange-700 py-2 rounded font-bold text-sm flex items-center justify-center gap-2"
                >
                  <TicketPercent size={16} /> Ver/Crear Cupones
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowSettingsModal(false)}
              className="w-full mt-4 bg-gray-200 py-2 rounded font-bold text-gray-600 text-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {showCouponsModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl w-full max-w-sm p-5 shadow-2xl relative">
            <button
              onClick={() => setShowCouponsModal(false)}
              className="absolute top-3 right-3 text-gray-400"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-orange-600">
              <TicketPercent size={24} /> Cupones Activos
            </h3>
            <div className="max-h-40 overflow-y-auto mb-4 space-y-2">
              {couponsList.length === 0 ? (
                <p className="text-sm text-gray-400 text-center italic">
                  No hay cupones creados.
                </p>
              ) : (
                couponsList.map((c) => (
                  <div
                    key={c.id}
                    className="flex justify-between items-center bg-orange-50 p-2 rounded border border-orange-100"
                  >
                    <div>
                      <span className="font-bold text-gray-800">{c.code}</span>{" "}
                      <span className="text-xs text-orange-600 font-bold">
                        (-{c.discount}%)
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteCoupon(c.id)}
                      className="text-red-500 hover:bg-red-100 p-1 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="border-t pt-4">
              <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">
                Crear Nuevo
              </h4>
              <div className="flex gap-2">
                <input
                  placeholder="CÓDIGO (Ej: PROMO)"
                  className="flex-1 border p-2 rounded text-sm uppercase"
                  value={newCoupon.code}
                  onChange={(e) =>
                    setNewCoupon({
                      ...newCoupon,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                />
                <input
                  type="number"
                  placeholder="%"
                  className="w-16 border p-2 rounded text-sm"
                  value={newCoupon.discount}
                  onChange={(e) =>
                    setNewCoupon({
                      ...newCoupon,
                      discount: Number(e.target.value),
                    })
                  }
                />
                <button
                  onClick={handleAddCoupon}
                  className="bg-green-600 text-white p-2 rounded"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <nav
        className={`sticky top-0 z-40 text-white shadow-lg transition-colors ${
          isAdminMode ? "bg-gray-800" : "bg-red-700"
        }`}
      >
        {!isStoreOpen && !isAdminMode && (
          <div className="bg-gray-900 text-yellow-400 p-1 text-center text-xs font-bold flex items-center justify-center gap-1 border-b border-gray-700">
            <Clock size={12} /> Cerrado (Abre {storeSchedule.open}:00 -{" "}
            {storeSchedule.close}:00)
          </div>
        )}

        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center mb-3">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => {
                setView("landing");
                setSearchQuery("");
              }}
            >
              <div
                className={`p-2 rounded-full ${
                  isAdminMode ? "bg-gray-600" : "bg-yellow-400 text-red-700"
                }`}
              >
                <ChefHat size={24} />
              </div>
              <div>
                <h1 className="font-bold text-xl leading-none">
                  {isAdminMode ? "Modo Dueño" : "BurgerKing"}
                </h1>
                <p
                  className={`text-xs ${
                    isAdminMode ? "text-green-400 font-bold" : "text-red-200"
                  }`}
                >
                  {isAdminMode ? "● EDICIÓN ACTIVA" : "Delivery Express"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAdminMode && (
                <button
                  onClick={() => setShowSettingsModal(true)}
                  className="p-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600"
                >
                  <Settings size={20} />
                </button>
              )}
              <button
                onClick={handleAdminToggle}
                className={`p-2 rounded-lg transition-colors flex items-center gap-2 ${
                  isAdminMode
                    ? "bg-green-500 text-white shadow-lg ring-2 ring-green-300"
                    : "hover:bg-red-800 text-red-100"
                }`}
              >
                {isAdminMode ? (
                  <>
                    <span className="text-xs font-bold hidden sm:inline">
                      SALIR
                    </span>
                    <LogOut size={20} />
                  </>
                ) : (
                  <Lock size={20} />
                )}
              </button>
              {!isAdminMode && (
                <button
                  onClick={() => {
                    setIsCartOpen(true);
                    setCartStep("list");
                  }}
                  className="relative p-2 hover:bg-red-800 rounded-lg"
                >
                  <ShoppingCart size={24} />
                  {cart.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-yellow-400 text-red-800 text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                      {cart.reduce((a, b) => a + b.quantity, 0)}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>

          {!isAdminMode && view === "menu" && (
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border-none rounded-lg leading-5 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-300 sm:text-sm transition-colors shadow-sm"
                placeholder="¿Qué se te antoja hoy?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          )}
        </div>
      </nav>

      {!isAdminMode && (
        <button
          onClick={() => setShowAiModal(true)}
          className="fixed bottom-24 right-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-3 rounded-full shadow-lg z-40 animate-bounce-slow flex items-center gap-2 font-bold hover:scale-105 transition-transform"
        >
          <Sparkles size={24} />{" "}
          <span className="hidden sm:inline">¿Qué pedir?</span>
        </button>
      )}

      {showAiModal && (
        <div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowAiModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Bot size={24} /> Chef Virtual
              </h3>
              <button onClick={() => setShowAiModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-gray-100 p-3 rounded-lg text-sm text-gray-600">
                👋 ¡Hola! Soy tu asistente. ¿Tienes mucha hambre? ¿Te gusta lo
                picante? ¡Dime qué se te antoja y te recomiendo algo!
              </div>
              {aiResponse && (
                <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg text-sm text-orange-800 font-medium animate-fade-in">
                  👨‍🍳 {aiResponse}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ej: Algo con tocino..."
                  className="flex-1 border p-2 rounded-lg text-sm outline-none focus:border-orange-500"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && askTheChef()}
                />
                <button
                  onClick={askTheChef}
                  disabled={isAiLoading}
                  className="bg-orange-500 text-white p-2 rounded-lg disabled:opacity-50"
                >
                  {isAiLoading ? (
                    <Clock size={20} className="animate-spin" />
                  ) : (
                    <ArrowRight size={20} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedProduct && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-3 right-3 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
            >
              <X size={20} />
            </button>
            <div className="h-56 relative shrink-0">
              <img
                src={selectedProduct.image}
                alt={selectedProduct.name}
                className="w-full h-full object-cover"
              />
              {/* BADGE DE CATEGORÍA EN EL MODAL */}
              {(() => {
                const style = getCategoryStyle(selectedProduct.category);
                return (
                  <span
                    className={`absolute bottom-3 left-3 ${style.bg} ${style.text} backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-1`}
                  >
                    {style.icon} {selectedProduct.category}
                  </span>
                );
              })()}
              {/* BADGE DE MARKETING */}
              {renderBadge(selectedProduct.badge)}
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-2xl font-bold text-gray-900 leading-tight">
                  {selectedProduct.name}
                </h2>
                <span className="text-lg font-bold text-gray-500">
                  {formatPrice(selectedProduct.price)}
                </span>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                {selectedProduct.description}
              </p>

              {!isAdminMode &&
                selectedProduct.category !== "Acompañamientos" &&
                selectedProduct.category !== "Bebidas" && (
                  <div className="space-y-4 mb-4">
                    {/* SECCIÓN EXTRAS: ACOMPAÑAMIENTOS */}
                    {sideItems.length > 0 && (
                      <div>
                        <h3 className="text-sm font-bold text-gray-700 mb-2">
                          🍟 Completa tu orden con:
                        </h3>
                        <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide">
                          {sideItems.map((extra) => {
                            const isSelected = selectedExtras.find(
                              (e) => e.id === extra.id
                            );
                            return (
                              <div
                                key={extra.id}
                                onClick={() => toggleExtra(extra)}
                                className={`shrink-0 w-32 border rounded-xl overflow-hidden cursor-pointer transition-all ${
                                  isSelected
                                    ? "border-green-500 ring-2 ring-green-100 bg-green-50"
                                    : "border-gray-200 bg-white"
                                }`}
                              >
                                <div className="h-20">
                                  <img
                                    src={extra.image}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="p-2 text-center">
                                  <p className="text-xs font-bold truncate">
                                    {extra.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatPrice(extra.price)}
                                  </p>
                                  {isSelected && (
                                    <div className="mt-1 flex justify-center">
                                      <CheckCircle2
                                        size={16}
                                        className="text-green-600"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* SECCIÓN EXTRAS: BEBIDAS */}
                    {drinkItems.length > 0 && (
                      <div>
                        <h3 className="text-sm font-bold text-gray-700 mb-2">
                          🥤 ¿Algo para tomar?
                        </h3>
                        <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide">
                          {drinkItems.map((extra) => {
                            const isSelected = selectedExtras.find(
                              (e) => e.id === extra.id
                            );
                            return (
                              <div
                                key={extra.id}
                                onClick={() => toggleExtra(extra)}
                                className={`shrink-0 w-32 border rounded-xl overflow-hidden cursor-pointer transition-all ${
                                  isSelected
                                    ? "border-green-500 ring-2 ring-green-100 bg-green-50"
                                    : "border-gray-200 bg-white"
                                }`}
                              >
                                <div className="h-20">
                                  <img
                                    src={extra.image}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="p-2 text-center">
                                  <p className="text-xs font-bold truncate">
                                    {extra.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatPrice(extra.price)}
                                  </p>
                                  {isSelected && (
                                    <div className="mt-1 flex justify-center">
                                      <CheckCircle2
                                        size={16}
                                        className="text-green-600"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* SECCIÓN EXTRAS: PERROS CALIENTES (NUEVO) */}
                    {hotdogItems.length > 0 && (
                      <div>
                        <h3 className="text-sm font-bold text-gray-700 mb-2">
                          🌭 ¿Antojo de un Perro Caliente?
                        </h3>
                        <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide">
                          {hotdogItems.map((extra) => {
                            const isSelected = selectedExtras.find(
                              (e) => e.id === extra.id
                            );
                            return (
                              <div
                                key={extra.id}
                                onClick={() => toggleExtra(extra)}
                                className={`shrink-0 w-32 border rounded-xl overflow-hidden cursor-pointer transition-all ${
                                  isSelected
                                    ? "border-green-500 ring-2 ring-green-100 bg-green-50"
                                    : "border-gray-200 bg-white"
                                }`}
                              >
                                <div className="h-20">
                                  <img
                                    src={extra.image}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="p-2 text-center">
                                  <p className="text-xs font-bold truncate">
                                    {extra.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatPrice(extra.price)}
                                  </p>
                                  {isSelected && (
                                    <div className="mt-1 flex justify-center">
                                      <CheckCircle2
                                        size={16}
                                        className="text-green-600"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* SECCIÓN EXTRAS: ENSALADAS (NUEVO) */}
                    {saladItems.length > 0 && (
                      <div>
                        <h3 className="text-sm font-bold text-gray-700 mb-2">
                          🥗 Algo fresco:
                        </h3>
                        <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide">
                          {saladItems.map((extra) => {
                            const isSelected = selectedExtras.find(
                              (e) => e.id === extra.id
                            );
                            return (
                              <div
                                key={extra.id}
                                onClick={() => toggleExtra(extra)}
                                className={`shrink-0 w-32 border rounded-xl overflow-hidden cursor-pointer transition-all ${
                                  isSelected
                                    ? "border-green-500 ring-2 ring-green-100 bg-green-50"
                                    : "border-gray-200 bg-white"
                                }`}
                              >
                                <div className="h-20">
                                  <img
                                    src={extra.image}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="p-2 text-center">
                                  <p className="text-xs font-bold truncate">
                                    {extra.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatPrice(extra.price)}
                                  </p>
                                  {isSelected && (
                                    <div className="mt-1 flex justify-center">
                                      <CheckCircle2
                                        size={16}
                                        className="text-green-600"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* SECCIÓN EXTRAS: POSTRES (NUEVO) */}
                    {dessertItems.length > 0 && (
                      <div>
                        <h3 className="text-sm font-bold text-gray-700 mb-2">
                          🍰 El toque dulce:
                        </h3>
                        <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide">
                          {dessertItems.map((extra) => {
                            const isSelected = selectedExtras.find(
                              (e) => e.id === extra.id
                            );
                            return (
                              <div
                                key={extra.id}
                                onClick={() => toggleExtra(extra)}
                                className={`shrink-0 w-32 border rounded-xl overflow-hidden cursor-pointer transition-all ${
                                  isSelected
                                    ? "border-green-500 ring-2 ring-green-100 bg-green-50"
                                    : "border-gray-200 bg-white"
                                }`}
                              >
                                <div className="h-20">
                                  <img
                                    src={extra.image}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="p-2 text-center">
                                  <p className="text-xs font-bold truncate">
                                    {extra.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatPrice(extra.price)}
                                  </p>
                                  {isSelected && (
                                    <div className="mt-1 flex justify-center">
                                      <CheckCircle2
                                        size={16}
                                        className="text-green-600"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              {selectedProduct.name === "Fundiburguer" && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4 space-y-4">
                  <h3 className="font-bold text-yellow-800 text-sm flex items-center gap-2">
                    <CheckCircle2 size={16} /> Personaliza tu Fundiburguer
                  </h3>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex justify-between">
                      1. Elige tu Proteína{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {["CARNE", "CHULETA AHUMADA", "POLLO"].map((opt) => (
                        <button
                          key={opt}
                          onClick={() =>
                            setFundiOptions({ ...fundiOptions, proteina: opt })
                          }
                          className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                            fundiOptions.proteina === opt
                              ? "bg-yellow-500 text-white border-yellow-500 shadow-md ring-2 ring-yellow-200"
                              : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {opt} {fundiOptions.proteina === opt && "✓"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex justify-between">
                      2. Elige tu Salsa <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {["Queso Fundido", "Ketchup Pampero"].map((opt) => (
                        <button
                          key={opt}
                          onClick={() =>
                            setFundiOptions({ ...fundiOptions, salsa: opt })
                          }
                          className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                            fundiOptions.salsa === opt
                              ? "bg-red-500 text-white border-red-500 shadow-md ring-2 ring-red-200"
                              : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {opt} {fundiOptions.salsa === opt && "✓"}
                        </button>
                      ))}
                    </div>
                  </div>
                  {(!fundiOptions.proteina || !fundiOptions.salsa) && (
                    <p className="text-xs text-red-600 font-medium flex items-center gap-1 animate-pulse">
                      <AlertCircle size={12} /> Debes seleccionar ambas
                      opciones.
                    </p>
                  )}
                </div>
              )}
              <div className="mb-4">
                <label className="text-sm font-bold text-gray-700 mb-1 flex items-center gap-1">
                  <StickyNote size={14} /> Nota / Observación:
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none bg-gray-50"
                  rows="2"
                  placeholder="Ej: Sin cebolla, Salsa aparte..."
                  value={productNote}
                  onChange={(e) => setProductNote(e.target.value)}
                ></textarea>
              </div>
              <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3 bg-white rounded-lg shadow-sm border border-gray-200 p-1">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                  >
                    <Minus size={20} />
                  </button>
                  <span className="text-xl font-bold w-8 text-center text-gray-800">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                <div className="text-right">
                  <span className="block text-xs font-bold text-gray-500 uppercase">
                    Total
                  </span>
                  <span className="text-2xl font-bold text-red-600">
                    {formatPrice(currentModalTotal)}
                  </span>
                  {selectedExtras.length > 0 && (
                    <span className="block text-xs text-gray-400">
                      Incluye {selectedExtras.length} extras
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <button
                  onClick={addAllToCart}
                  disabled={!isProductValid(selectedProduct)}
                  className={`w-full font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 border ${
                    isProductValid(selectedProduct)
                      ? "bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300"
                      : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed grayscale"
                  }`}
                >
                  <ShoppingCart size={20} />
                  {isProductValid(selectedProduct)
                    ? "Agregar al Carrito"
                    : "Completa las opciones"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLogin && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
            <button
              onClick={() => setShowLogin(false)}
              className="absolute top-4 right-4 text-gray-400"
            >
              <X size={24} />
            </button>
            <div className="flex flex-col items-center mb-6">
              <div className="bg-red-100 p-3 rounded-full mb-3 text-red-600">
                <KeyRound size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Acceso Dueño</h3>
            </div>
            <form onSubmit={handleLoginSubmit}>
              <input
                type="password"
                inputMode="numeric"
                className="w-full border-2 border-gray-200 rounded-xl p-4 text-center text-3xl tracking-[1em] mb-6 outline-none font-bold"
                placeholder="••••"
                autoFocus
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
              <button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-lg"
              >
                Entrar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* BARRA FLOTANTE */}
      {cart.length > 0 && view === "menu" && !isCartOpen && (
        <div
          onClick={() => {
            setIsCartOpen(true);
            setCartStep("list");
          }}
          className="fixed bottom-0 left-0 right-0 bg-red-600 text-white p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] z-50 cursor-pointer animate-slide-up flex justify-between items-center hover:bg-red-700 transition-colors"
        >
          <div className="flex flex-col">
            <span className="text-xs font-medium text-red-100 uppercase tracking-wide">
              {totalQty} {totalQty === 1 ? "Producto" : "Productos"}
            </span>
            <span className="text-2xl font-bold leading-none">
              {formatPrice(total)}
            </span>
          </div>
          <div className="flex items-center gap-2 font-bold bg-white text-red-600 px-5 py-2.5 rounded-full shadow-sm hover:scale-105 transition-transform">
            Ver Pedido <ArrowRight size={20} />
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <main className="max-w-4xl mx-auto p-4 pb-20">
        {authError === "needs_setup" && (
          <div className="bg-red-600 text-white p-4 mb-6 rounded-lg shadow-lg flex items-start gap-3 animate-bounce-slow">
            <ShieldAlert className="shrink-0 mt-1" size={24} />
            <div className="flex-1">
              <h3 className="font-bold text-lg">
                ⚠️ Falta activar Firebase Auth
              </h3>
              {!isAdminMode && (
                <button
                  onClick={() => setIsAdminMode(true)}
                  className="underline font-bold text-white hover:text-red-200 text-sm"
                >
                  Ver solución
                </button>
              )}
            </div>
          </div>
        )}

        {authError === "needs_setup" && isAdminMode && (
          <div className="bg-white border-l-4 border-red-500 p-6 mb-6 rounded shadow-xl">
            <h3 className="font-bold text-red-800 text-xl mb-4">
              Activa el acceso Anónimo en Firebase Authentication.
            </h3>
          </div>
        )}

        {/* ADMIN: AGREGAR */}
        {isAdminMode && !authError && (
          <div className="mb-8 animate-fade-in">
            {!isAddingNew ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsAddingNew(true)}
                  className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md hover:bg-green-700"
                >
                  <Plus size={20} /> Agregar Nuevo Plato
                </button>
                {menuItems.length === 0 && (
                  <button
                    onClick={seedDatabase}
                    className="bg-blue-600 text-white px-4 rounded-xl font-bold flex items-center gap-2 shadow-md hover:bg-blue-700"
                  >
                    <UploadCloud size={20} />
                  </button>
                )}
              </div>
            ) : (
              <form
                onSubmit={handleAddNew}
                className="bg-white p-4 rounded-xl shadow-lg border-2 border-green-500 space-y-3"
              >
                <h3 className="font-bold text-green-700">Nuevo Producto</h3>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    required
                    placeholder="Nombre"
                    className="border p-2 rounded"
                    value={newItem.name}
                    onChange={(e) =>
                      setNewItem({ ...newItem, name: e.target.value })
                    }
                  />
                  <input
                    required
                    type="number"
                    placeholder="Precio"
                    className="border p-2 rounded"
                    value={newItem.price}
                    onChange={(e) =>
                      setNewItem({ ...newItem, price: e.target.value })
                    }
                  />
                </div>
                <div className="relative">
                  <input
                    required
                    placeholder="Descripción"
                    className="w-full border p-2 rounded pr-12"
                    value={newItem.description}
                    onChange={(e) =>
                      setNewItem({ ...newItem, description: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    onClick={generateDescription}
                    disabled={aiGeneratingDesc}
                    className="absolute right-2 top-1.5 text-purple-600 hover:text-purple-800 disabled:opacity-50"
                    title="Generar descripción con IA"
                  >
                    {aiGeneratingDesc ? (
                      <Clock size={20} className="animate-spin" />
                    ) : (
                      <Sparkles size={20} />
                    )}
                  </button>
                </div>
                <div className="space-y-2 border p-3 rounded-lg bg-gray-50">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-gray-600 flex items-center gap-2">
                      <ImageIcon size={16} /> Foto del Producto
                    </label>
                    <span className="text-xs text-gray-400">Max 1MB</span>
                  </div>
                  <div className="flex gap-2">
                    <label className="flex-1 cursor-pointer bg-white border border-gray-300 hover:border-green-500 text-gray-600 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors">
                      <Camera size={18} />{" "}
                      <span className="text-sm font-medium">Subir Foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageSelect(e, false)}
                      />
                    </label>
                    <input
                      placeholder="O pega una URL..."
                      className="flex-[2] border p-2 rounded text-sm"
                      value={newItem.image}
                      onChange={(e) =>
                        setNewItem({ ...newItem, image: e.target.value })
                      }
                    />
                  </div>
                  {newItem.image && (
                    <div className="w-full h-32 bg-gray-200 rounded-lg overflow-hidden relative">
                      <img
                        src={newItem.image}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setNewItem({ ...newItem, image: "" })}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    className="border p-2 rounded bg-white"
                    value={newItem.category}
                    onChange={(e) =>
                      setNewItem({ ...newItem, category: e.target.value })
                    }
                  >
                    {CATEGORIES_LIST.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <select
                    className="border p-2 rounded bg-white"
                    value={newItem.badge}
                    onChange={(e) =>
                      setNewItem({ ...newItem, badge: e.target.value })
                    }
                  >
                    {BADGES_LIST.map((b) => (
                      <option key={b.value} value={b.value}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                  <span className="text-sm font-bold text-yellow-800 flex items-center gap-2">
                    <ToggleRight className="text-yellow-600" /> ¿Ofrecer papas
                    extra ($5k)?
                  </span>
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-green-600"
                    checked={newItem.upsell || false}
                    onChange={(e) =>
                      setNewItem({ ...newItem, upsell: e.target.checked })
                    }
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingNew(false)}
                    className="flex-1 py-2 text-gray-500 font-bold bg-gray-100 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* MENÚ */}
        {view === "success" ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageCircle size={40} />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              ¡Pedido Listo!
            </h2>
            <button
              onClick={() => setView("menu")}
              className="bg-red-600 text-white px-8 py-3 rounded-full font-bold hover:bg-red-700 transition shadow-lg"
            >
              Volver al Menú
            </button>
          </div>
        ) : (
          <>
            {!isAdminMode && (
              <div className="relative bg-black rounded-2xl overflow-hidden mb-8 shadow-xl">
                <img
                  src="https://images.unsplash.com/photo-1550547660-d9450f859349?w=1000&auto=format&fit=crop&q=60"
                  alt="Hero"
                  className="w-full h-48 md:h-64 object-cover opacity-60"
                />
                <div className="absolute inset-0 flex flex-col justify-center p-6 md:p-10">
                  <h2 className="text-3xl md:text-5xl font-bold text-white mb-2 drop-shadow-md">
                    ¿Hambre voraz? 🦁
                  </h2>
                </div>
              </div>
            )}

            <div className="flex overflow-x-auto gap-3 pb-4 mb-6 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all shadow-sm ${
                    activeCategory === cat
                      ? "bg-red-600 text-white transform scale-105"
                      : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`bg-white rounded-xl shadow-md overflow-hidden transition-all border ${
                    isAdminMode
                      ? "border-gray-300"
                      : "border-gray-100 hover:shadow-xl"
                  } flex flex-col group`}
                >
                  {editingItem?.id === item.id ? (
                    <div className="p-4 space-y-3 bg-blue-50 h-full">
                      <input
                        className="w-full border p-2 rounded"
                        value={editingItem.name}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            name: e.target.value,
                          })
                        }
                        placeholder="Nombre"
                      />
                      <input
                        type="number"
                        className="w-full border p-2 rounded"
                        value={editingItem.price}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            price: e.target.value,
                          })
                        }
                        placeholder="Precio"
                      />
                      <div className="relative">
                        <textarea
                          className="w-full border p-2 rounded text-sm pr-8"
                          rows="2"
                          value={editingItem.description}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              description: e.target.value,
                            })
                          }
                          placeholder="Descripción"
                        ></textarea>
                        <button
                          type="button"
                          onClick={() => {
                            setNewItem(editingItem);
                            generateDescription().then(() => {
                              setEditingItem((prev) => ({
                                ...prev,
                                description: newItem.description,
                              }));
                            });
                          }}
                          className="absolute right-2 top-2 text-purple-600 hover:text-purple-800"
                          title="Mejorar con IA"
                        >
                          <Sparkles size={16} />
                        </button>
                      </div>
                      <div className="flex gap-2 items-center">
                        <img
                          src={editingItem.image}
                          className="w-10 h-10 rounded object-cover border"
                        />
                        <label className="flex-1 cursor-pointer bg-white border border-gray-300 text-xs text-gray-600 py-2 rounded flex items-center justify-center gap-1 hover:bg-gray-50">
                          <Camera size={14} /> Cambiar Foto
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageSelect(e, true)}
                          />
                        </label>
                      </div>
                      <input
                        className="w-full border p-2 rounded text-xs"
                        value={editingItem.image}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            image: e.target.value,
                          })
                        }
                        placeholder="URL Imagen"
                      />

                      {/* Selector de Categoría en Edición */}
                      <select
                        className="w-full border p-2 rounded text-sm bg-white mb-2"
                        value={editingItem.category}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            category: e.target.value,
                          })
                        }
                      >
                        {CATEGORIES_LIST.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>

                      <select
                        className="w-full border p-2 rounded text-sm bg-white"
                        value={editingItem.badge || ""}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            badge: e.target.value,
                          })
                        }
                      >
                        {BADGES_LIST.map((b) => (
                          <option key={b.value} value={b.value}>
                            {b.label}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center justify-between bg-yellow-50 p-2 rounded border border-yellow-200">
                        <span className="text-xs font-bold text-yellow-800">
                          ¿Ofrecer papas extra?
                        </span>
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-green-600"
                          checked={editingItem.upsell || false}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              upsell: e.target.checked,
                            })
                          }
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingItem(null)}
                          className="flex-1 bg-gray-200 py-2 rounded text-sm font-bold"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleSaveEdit(editingItem)}
                          className="flex-1 bg-blue-600 text-white py-2 rounded text-sm font-bold flex justify-center gap-1"
                        >
                          <Save size={16} /> Guardar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        className="h-48 overflow-hidden relative cursor-pointer"
                        onClick={() => !isAdminMode && openProductModal(item)}
                      >
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        {renderBadge(item.badge)}
                        {!isAdminMode && (
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <span className="opacity-0 group-hover:opacity-100 bg-white/90 px-3 py-1 rounded-full text-xs font-bold text-gray-800 shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all flex items-center gap-1">
                              <Eye size={14} /> Ver Detalles
                            </span>
                          </div>
                        )}
                        {isAdminMode ? (
                          <div className="absolute top-2 right-2 flex flex-col gap-2 z-20">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingItem(item);
                              }}
                              className="bg-white text-blue-600 p-2 rounded-full shadow-lg border border-gray-200 hover:scale-110 transition-transform"
                            >
                              <Edit2 size={20} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteItem(item.id);
                              }}
                              className="bg-white text-red-600 p-2 rounded-full shadow-lg border border-gray-200 hover:scale-110 transition-transform"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        ) : (
                          <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-gray-800 text-xs font-bold px-2 py-1 rounded-md shadow-sm">
                            {item.category}
                          </span>
                        )}
                      </div>
                      <div className="p-5 flex-1 flex flex-col">
                        <h3
                          className="text-xl font-bold mb-1 text-gray-800 cursor-pointer hover:text-red-700 transition-colors"
                          onClick={() => !isAdminMode && openProductModal(item)}
                        >
                          {item.name}
                        </h3>
                        <p className="text-gray-500 text-sm mb-4 line-clamp-2 flex-1">
                          {item.description}
                        </p>
                        <div className="flex justify-between items-center mt-4">
                          <span className="text-xl font-bold text-red-700">
                            {formatPrice(item.price)}
                          </span>
                          {!isAdminMode ? (
                            <button
                              onClick={() => openProductModal(item)}
                              className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white p-2.5 rounded-full transition-all shadow-sm active:scale-95"
                              title="Ver opciones"
                            >
                              <Plus size={20} />
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2 py-1 rounded">
                              ID: {item.id.slice(0, 4)}...
                            </span>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* CARRITO SLIDEOVER */}
      {isCartOpen && !isAdminMode && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setIsCartOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
            <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                {cartStep === "list" ? (
                  <>
                    <ShoppingCart size={20} className="text-red-600" /> Tu
                    Pedido
                  </>
                ) : (
                  <button
                    onClick={() => setCartStep("list")}
                    className="flex items-center gap-1 text-gray-600 hover:text-red-600 text-sm"
                  >
                    <ArrowLeft size={18} /> Volver
                  </button>
                )}
              </h2>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
              {cartStep === "list" && (
                <div className="space-y-4">
                  {cart.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                      <p className="font-medium text-lg">
                        Tu carrito está vacío
                      </p>
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div
                        key={item.id}
                        className="flex gap-3 items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm relative"
                      >
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-gray-800 truncate">
                            {item.name}
                          </h4>
                          <p className="text-red-600 font-bold text-sm">
                            {formatPrice(item.price * item.quantity)}
                          </p>
                          {item.note && (
                            <p className="text-xs text-gray-500 italic mt-1 bg-yellow-50 px-2 py-1 rounded inline-block">
                              Nota: {item.note}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-gray-400 hover:text-red-500 p-1"
                          >
                            <Trash2 size={16} />
                          </button>
                          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              className="w-6 h-6 flex items-center justify-center hover:bg-white rounded text-gray-600"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="text-sm font-bold w-4 text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              className="w-6 h-6 flex items-center justify-center hover:bg-white rounded text-gray-600"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {cartStep === "checkout" && (
                <div className="animate-fade-in space-y-6">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold">
                        Total a Pagar
                      </p>
                      <p className="text-2xl font-bold text-red-600">
                        {formatPrice(total)}
                      </p>
                    </div>
                    <span className="bg-red-50 text-red-600 text-xs font-bold px-2 py-1 rounded">
                      {cart.length} ítems
                    </span>
                  </div>
                  <form onSubmit={handleCheckout} className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">
                        Tipo de Entrega
                      </label>
                      <div className="flex gap-2 bg-white p-1 rounded-xl border border-gray-200">
                        <button
                          type="button"
                          onClick={() => setOrderType("delivery")}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                            orderType === "delivery"
                              ? "bg-red-50 text-red-600"
                              : "text-gray-400 hover:text-gray-600"
                          }`}
                        >
                          <Bike size={18} /> Domicilio
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrderType("pickup")}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                            orderType === "pickup"
                              ? "bg-red-50 text-red-600"
                              : "text-gray-400 hover:text-gray-600"
                          }`}
                        >
                          <Store size={18} /> Recoger
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrderType("table")}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                            orderType === "table"
                              ? "bg-red-50 text-red-600"
                              : "text-gray-400 hover:text-gray-600"
                          }`}
                        >
                          <Utensils size={18} /> Mesa
                        </button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="relative group">
                        <input
                          required
                          type="text"
                          placeholder="Tu Nombre"
                          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                          value={customerInfo.name}
                          onChange={(e) =>
                            setCustomerInfo({
                              ...customerInfo,
                              name: e.target.value,
                            })
                          }
                        />
                        <div className="absolute left-3 top-3.5 text-gray-400">
                          <ChefHat size={18} />
                        </div>
                      </div>
                      {orderType === "delivery" && (
                        <div className="relative group animate-fade-in">
                          <input
                            required
                            type="text"
                            placeholder="Dirección completa"
                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                            value={customerInfo.address}
                            onChange={(e) =>
                              setCustomerInfo({
                                ...customerInfo,
                                address: e.target.value,
                              })
                            }
                          />
                          <div className="absolute left-3 top-3.5 text-gray-400">
                            <MapPin size={18} />
                          </div>
                        </div>
                      )}
                      {orderType === "table" && (
                        <div className="relative group animate-fade-in">
                          <input
                            required
                            type="text"
                            placeholder="Número de Mesa"
                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                            value={customerInfo.address}
                            onChange={(e) =>
                              setCustomerInfo({
                                ...customerInfo,
                                address: e.target.value,
                              })
                            }
                          />
                          <div className="absolute left-3 top-3.5 text-gray-400">
                            <MapPin size={18} />
                          </div>
                        </div>
                      )}
                      <div className="relative group">
                        <input
                          required
                          type="tel"
                          placeholder="Teléfono / WhatsApp"
                          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                          value={customerInfo.phone}
                          onChange={(e) =>
                            setCustomerInfo({
                              ...customerInfo,
                              phone: e.target.value,
                            })
                          }
                        />
                        <div className="absolute left-3 top-3.5 text-gray-400">
                          <Phone size={18} />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">
                        Método de Pago
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod("Efectivo")}
                          className={`py-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all border ${
                            paymentMethod === "Efectivo"
                              ? "bg-green-50 border-green-500 text-green-700"
                              : "bg-white border-gray-200 text-gray-400"
                          }`}
                        >
                          <Banknote size={20} /> Efectivo
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod("Pago Movil")}
                          className={`py-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all border ${
                            paymentMethod === "Pago Movil"
                              ? "bg-blue-50 border-blue-500 text-blue-700"
                              : "bg-white border-gray-200 text-gray-400"
                          }`}
                        >
                          <Smartphone size={20} /> Pago Móvil
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod("Binance")}
                          className={`py-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all border ${
                            paymentMethod === "Binance"
                              ? "bg-yellow-50 border-yellow-500 text-yellow-700"
                              : "bg-white border-gray-200 text-gray-400"
                          }`}
                        >
                          <Bitcoin size={20} /> Binance
                        </button>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                    >
                      <MessageCircle size={20} /> Enviar Pedido por WhatsApp
                    </button>
                  </form>
                </div>
              )}
            </div>

            {cartStep === "list" && cart.length > 0 && (
              <div className="p-4 border-t bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-600 font-medium">
                    Total a pagar:
                  </span>
                  <span className="text-2xl font-bold text-red-600">
                    {formatPrice(total)}
                  </span>
                </div>
                <button
                  onClick={() => setCartStep("checkout")}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                >
                  Continuar con el Pedido <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
