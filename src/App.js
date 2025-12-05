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
} from "firebase/firestore";

// --- CONFIGURACIÓN GENERAL ---
const NUMERO_WHATSAPP = "573144709786";

// 2. CONFIGURACIÓN DE TU BASE DE DATOS REAL (FIREBASE)
const YOUR_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCK1M_aGt2RoJm-QdAHNHIX9X_t3lQIfds",
  authDomain: "burguerapp-b6cc1.firebaseapp.com",
  projectId: "burguerapp-b6cc1",
  storageBucket: "burguerapp-b6cc1.firebasestorage.app",
  messagingSenderId: "1072944343304",
  appId: "1:1072944343304:web:a6a6781f0c2f16e29fa4bd",
};

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
  },
  {
    id: "2",
    name: "Doble Bacon",
    description:
      "Doble carne, doble tocino crujiente, cebolla caramelizada y BBQ.",
    price: 24000,
    category: "Hamburguesas",
    image:
      "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=500&auto=format&fit=crop&q=60",
  },
];

// --- GESTIÓN DE BASE DE DATOS ---
let db = null;
let auth = null;
let useFirebase = false;
let collectionRef = null;

try {
  if (YOUR_FIREBASE_CONFIG.apiKey.length > 0) {
    const app = initializeApp(YOUR_FIREBASE_CONFIG);
    auth = getAuth(app);
    db = getFirestore(app);
    useFirebase = true;
    collectionRef = collection(db, "menu");
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
  }
} catch (e) {
  // Error silencioso
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
  const [view, setView] = useState("menu");
  const [activeCategory, setActiveCategory] = useState("Todas");

  // Estados Admin
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState({
    name: "",
    price: "",
    category: "Hamburguesas",
    description: "",
    image: "",
  });
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Estados Seguridad
  const [showLogin, setShowLogin] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const ADMIN_PASSWORD = "1234";

  // --- CARGA DE DATOS ---
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.tailwindcss.com";
    script.async = true;
    document.head.appendChild(script);

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
                  loadLocalData();
                }
              );
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
  }, []);

  const loadLocalData = () => {
    const savedMenu = localStorage.getItem("burger_menu_items");
    if (savedMenu) setMenuItems(JSON.parse(savedMenu));
    else setMenuItems([]);
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

  const dbAdd = async (item) => {
    if (isFirebaseReady()) {
      try {
        await addDoc(collectionRef, item);
      } catch (e) {
        alert("Error guardando.");
      }
    } else {
      const newItem = { ...item, id: Date.now().toString() };
      saveDataLocal([...menuItems, newItem]);
    }
  };

  const dbUpdate = async (item) => {
    if (isFirebaseReady()) {
      let itemRef =
        YOUR_FIREBASE_CONFIG.apiKey.length > 0
          ? doc(db, "menu", item.id)
          : doc(
              db,
              "artifacts",
              typeof __app_id !== "undefined" ? __app_id : "default-app-id",
              "public",
              "data",
              "menu_items",
              item.id
            );
      await updateDoc(itemRef, {
        name: item.name,
        price: Number(item.price),
        description: item.description,
        category: item.category,
        image: item.image,
      });
    } else {
      const updated = menuItems.map((i) => (i.id === item.id ? item : i));
      saveDataLocal(updated);
    }
  };

  const dbDelete = async (id) => {
    if (isFirebaseReady()) {
      let itemRef =
        YOUR_FIREBASE_CONFIG.apiKey.length > 0
          ? doc(db, "menu", id)
          : doc(
              db,
              "artifacts",
              typeof __app_id !== "undefined" ? __app_id : "default-app-id",
              "public",
              "data",
              "menu_items",
              id
            );
      await deleteDoc(itemRef);
    } else {
      const filtered = menuItems.filter((i) => i.id !== id);
      saveDataLocal(filtered);
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

  // --- MANEJO DE IMÁGENES (NUEVO) ---
  const handleImageSelect = (e, isEdit = false) => {
    const file = e.target.files[0];
    if (file) {
      // Validar tamaño (Máximo 800KB para evitar errores de Firestore)
      if (file.size > 800 * 1024) {
        alert(
          "⚠️ La imagen es muy pesada. Por favor usa una más pequeña o una URL."
        );
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        if (isEdit) {
          setEditingItem({ ...editingItem, image: reader.result });
        } else {
          setNewItem({ ...newItem, image: reader.result });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // --- UI Y LOGIN ---
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
      alert("Contraseña incorrecta");
      setLoginPassword("");
    }
  };

  const handleAddNew = async (e) => {
    e.preventDefault();
    await dbAdd({
      ...newItem,
      price: Number(newItem.price),
      image:
        newItem.image ||
        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60",
    });
    setNewItem({
      name: "",
      price: "",
      category: "Hamburguesas",
      description: "",
      image: "",
    });
    setIsAddingNew(false);
  };

  const handleSaveEdit = async (item) => {
    await dbUpdate(item);
    setEditingItem(null);
  };

  const handleDeleteItem = async (id) => {
    if (confirm("¿Borrar producto?")) await dbDelete(id);
  };

  const categories = [
    "Todas",
    ...new Set(menuItems.map((item) => item.category)),
  ];
  const filteredItems =
    activeCategory === "Todas"
      ? menuItems
      : menuItems.filter((item) => item.category === activeCategory);

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing)
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      return [...prev, { ...item, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (itemId) =>
    setCart((prev) => prev.filter((item) => item.id !== itemId));

  const updateQuantity = (itemId, change) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const newQty = item.quantity + change;
          return newQty > 0 ? { ...item, quantity: newQty } : item;
        }
        return item;
      })
    );
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const formatPrice = (price) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(price);

  const handleCheckout = (e) => {
    e.preventDefault();
    let message = `Hola, soy *${customerInfo.name}* y quiero hacer un pedido:\n\n`;
    cart.forEach((item) => {
      message += `▪️ ${item.quantity}x ${item.name} - ${formatPrice(
        item.price * item.quantity
      )}\n`;
    });
    message += `\n*TOTAL: ${formatPrice(total)}*\n`;
    message += `\n📍 Dirección: ${customerInfo.address}`;
    message += `\n📱 Teléfono: ${customerInfo.phone}`;
    window.open(
      `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
    setCart([]);
    setView("success");
    setIsCartOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      {/* MODAL LOGIN */}
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

      {/* NAVBAR */}
      <nav
        className={`sticky top-0 z-40 text-white shadow-lg transition-colors ${
          isAdminMode ? "bg-gray-800" : "bg-red-700"
        }`}
      >
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setView("menu")}
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
                onClick={() => setIsCartOpen(!isCartOpen)}
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
      </nav>

      {/* MAIN */}
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

        {/* ADMIN: AGREGAR (CON SELECCIÓN DE FOTO) */}
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
                <input
                  required
                  placeholder="Descripción"
                  className="w-full border p-2 rounded"
                  value={newItem.description}
                  onChange={(e) =>
                    setNewItem({ ...newItem, description: e.target.value })
                  }
                />

                {/* SELECCIÓN DE IMAGEN MEJORADA */}
                <div className="space-y-2 border p-3 rounded-lg bg-gray-50">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-gray-600 flex items-center gap-2">
                      <ImageIcon size={16} /> Foto del Producto
                    </label>
                    <span className="text-xs text-gray-400">Max 1MB</span>
                  </div>

                  <div className="flex gap-2">
                    {/* Botón Galería */}
                    <label className="flex-1 cursor-pointer bg-white border border-gray-300 hover:border-green-500 text-gray-600 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors">
                      <Camera size={18} />
                      <span className="text-sm font-medium">Subir Foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageSelect(e, false)}
                      />
                    </label>

                    {/* Input URL (Respaldo) */}
                    <input
                      placeholder="O pega una URL..."
                      className="flex-[2] border p-2 rounded text-sm"
                      value={newItem.image}
                      onChange={(e) =>
                        setNewItem({ ...newItem, image: e.target.value })
                      }
                    />
                  </div>

                  {/* Previsualización */}
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
                    className="border p-2 rounded"
                    value={newItem.category}
                    onChange={(e) =>
                      setNewItem({ ...newItem, category: e.target.value })
                    }
                  >
                    <option>Hamburguesas</option>
                    <option>Acompañamientos</option>
                    <option>Bebidas</option>
                  </select>
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
                      <textarea
                        className="w-full border p-2 rounded text-sm"
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

                      {/* EDICIÓN DE FOTO MEJORADA */}
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
                      <div className="h-48 overflow-hidden relative">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        {isAdminMode ? (
                          <div className="absolute top-2 right-2 flex flex-col gap-2 z-20">
                            <button
                              onClick={() => setEditingItem(item)}
                              className="bg-white text-blue-600 p-2 rounded-full shadow-lg border border-gray-200 hover:scale-110 transition-transform"
                            >
                              <Edit2 size={20} />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
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
                        <h3 className="text-xl font-bold mb-1 text-gray-800">
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
                              onClick={() => addToCart(item)}
                              className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white p-2.5 rounded-full transition-all shadow-sm active:scale-95"
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

      {/* CARRITO */}
      {isCartOpen && !isAdminMode && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setIsCartOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
            <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                <ShoppingCart size={20} className="text-red-600" /> Tu Pedido
              </h2>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
              {cart.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <p className="font-medium text-lg">Tu carrito está vacío</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-3 items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm"
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
            {cart.length > 0 && (
              <div className="p-4 border-t bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-gray-600 font-medium">
                    Total a pagar:
                  </span>
                  <span className="text-2xl font-bold text-red-600">
                    {formatPrice(total)}
                  </span>
                </div>
                <form onSubmit={handleCheckout} className="space-y-3">
                  <input
                    required
                    type="text"
                    placeholder="Tu Nombre"
                    className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
                    value={customerInfo.name}
                    onChange={(e) =>
                      setCustomerInfo({ ...customerInfo, name: e.target.value })
                    }
                  />
                  <input
                    required
                    type="text"
                    placeholder="Dirección completa"
                    className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
                    value={customerInfo.address}
                    onChange={(e) =>
                      setCustomerInfo({
                        ...customerInfo,
                        address: e.target.value,
                      })
                    }
                  />
                  <input
                    required
                    type="tel"
                    placeholder="Teléfono"
                    className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
                    value={customerInfo.phone}
                    onChange={(e) =>
                      setCustomerInfo({
                        ...customerInfo,
                        phone: e.target.value,
                      })
                    }
                  />
                  <button
                    type="submit"
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg mt-4 flex items-center justify-center gap-2"
                  >
                    <MessageCircle size={20} /> Enviar Pedido por WhatsApp
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
