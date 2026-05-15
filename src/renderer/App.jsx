import React, { useState, useEffect, useMemo, useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  LayoutDashboard, 
  PlusCircle, 
  History, 
  Tag, 
  Settings, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  Printer, 
  MessageCircle,
  Package,
  ChevronRight,
  Monitor,
  User,
  Wrench,
  FileText,
  Smartphone,
  Cpu,
  Save,
  CheckCircle2,
  AlertCircle,
  X,
  Calendar,
  MoreVertical,
  ArrowRight,
  Clock,
  Check
} from 'lucide-react';

const CURRENT_VERSION = '1.0.0';
const GITHUB_REPO = 'MLA-ex3tav/MLAstore';

const navItems = [
  { id: 'view-registro', label: 'Nuevo Registro', icon: <PlusCircle className="w-5 h-5" /> },
  { id: 'view-pendientes', label: 'Tablero', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'view-historial', label: 'Historial', icon: <History className="w-5 h-5" /> },
  { id: 'view-precios', label: 'Precios', icon: <Tag className="w-5 h-5" /> },
  { id: 'view-configuracion', label: 'Configuración', icon: <Settings className="w-5 h-5" /> },
];

const App = () => {
  const [currentView, setCurrentView] = useState('view-registro');
  const [loading, setLoading] = useState(true);
  const [servicios, setServicios] = useState([]);
  const [precios, setPrecios] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [shopConfig, setShopConfig] = useState({ phone: '' });
  const [userName, setUserName] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingName, setOnboardingName] = useState('');
  const [updateInfo, setUpdateInfo] = useState({ available: false, checking: false, latestVersion: '', releaseNotes: '', downloadUrl: '' });
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, grupo_id: null });
  const [boletaModal, setBoletaModal] = useState({ isOpen: false, group: null });
  const [reporteModal, setReporteModal] = useState({ isOpen: false });
  const [dateDesde, setDateDesde] = useState('');
  const [dateHasta, setDateHasta] = useState('');
  const boletaRef = useRef(null);
  const reporteRef = useRef(null);
  
  // Registration Form State
  const [wizardStep, setWizardStep] = useState(1);
  const [formData, setFormData] = useState({
    cliente: '',
    telefono: '',
    equipo: '',
    tipo_equipo: 'Notebook',
    falla: '',
    specs: '',
    monto: 0,
    solucion: '',
    fecha_programada: ''
  });
  const [selectedServices, setSelectedServices] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);

  // Price Manager State
  const [newPrice, setNewPrice] = useState({ concepto: '', monto: '', es_paquete: false });
  const [editingPrice, setEditingPrice] = useState(null);

  // Draft Auto-save and Load
  useEffect(() => {
    const savedName = localStorage.getItem('mla_user_name');
    if (savedName) {
      setUserName(savedName);
    } else {
      setShowOnboarding(true);
    }
    
    const savedDraft = localStorage.getItem('mla_draft_registro');
    if (savedDraft) {
      try {
        const { draftFormData, draftWizardStep, draftEquipmentList, draftSelectedServices } = JSON.parse(savedDraft);
        if (draftFormData) setFormData(draftFormData);
        if (draftWizardStep) setWizardStep(draftWizardStep);
        if (draftEquipmentList) setEquipmentList(draftEquipmentList);
        if (draftSelectedServices) setSelectedServices(draftSelectedServices);
      } catch (e) {}
    }
    loadInitialData();
    checkForUpdates(false);
  }, []);

  useEffect(() => {
    // Only save draft if there is actual data being typed
    if (formData.cliente || equipmentList.length > 0 || wizardStep > 1) {
      localStorage.setItem('mla_draft_registro', JSON.stringify({
        draftFormData: formData,
        draftWizardStep: wizardStep,
        draftEquipmentList: equipmentList,
        draftSelectedServices: selectedServices
      }));
    }
  }, [formData, wizardStep, equipmentList, selectedServices]);

  const loadInitialData = async () => {
    if (!window.api) {
      console.warn("Electron API not found. Running in demo mode.");
      setLoading(false);
      return;
    }
    try {
      const [servs, precs, mods, phone] = await Promise.all([
        window.api.getServicios() || [],
        window.api.getPrecios() || [],
        window.api.getModelos() || [],
        window.api.getSetting('shop_phone') || ''
      ]);
      setServicios(servs);
      setPrecios(precs);
      setModelos(mods);
      setShopConfig({ phone: phone });
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  };

  const handleOnboarding = () => {
    if (!onboardingName.trim()) return;
    const name = onboardingName.trim();
    localStorage.setItem('mla_user_name', name);
    setUserName(name);
    setShowOnboarding(false);
    notify(`¡Bienvenido, ${name}!`, 'success');
  };

  const checkForUpdates = async (showNotification = false) => {
    setUpdateInfo(prev => ({ ...prev, checking: true }));
    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
      if (!res.ok) throw new Error('No se pudo verificar');
      const data = await res.json();
      const latestVersion = data.tag_name.replace(/^v/, '');
      
      const currentParts = CURRENT_VERSION.split('.').map(Number);
      const latestParts = latestVersion.split('.').map(Number);
      
      let hasUpdate = false;
      for (let i = 0; i < 3; i++) {
        if (latestParts[i] > currentParts[i]) { hasUpdate = true; break; }
        if (latestParts[i] < currentParts[i]) break;
      }
      
      if (hasUpdate) {
        setUpdateInfo({
          available: true,
          checking: false,
          latestVersion,
          releaseNotes: data.body || 'Sin notas de versión',
          downloadUrl: data.html_url || `https://github.com/${GITHUB_REPO}/releases`
        });
        setShowUpdateModal(true);
      } else {
        setUpdateInfo({ available: false, checking: false, latestVersion: CURRENT_VERSION, releaseNotes: '', downloadUrl: '' });
        if (showNotification) notify('Ya tienes la última versión', 'success');
      }
    } catch (err) {
      setUpdateInfo({ available: false, checking: false, latestVersion: '', releaseNotes: '', downloadUrl: '' });
      if (showNotification) notify('Error al verificar actualizaciones', 'error');
    }
  };

  const notify = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000);
  };

  const formatCLP = (num) => '$' + Math.round(num || 0).toLocaleString('es-CL');

  // --- Registration Logic ---
  const handleNextStep = () => {
    if (wizardStep < 4) setWizardStep(prev => prev + 1);
    else addToEquipmentList();
  };

  const addToEquipmentList = () => {
    const conceptText = selectedServices.map(s => s.concepto).join(', ');
    const fullDescription = conceptText + (formData.falla ? (conceptText ? ' | ' : '') + 'Notas: ' + formData.falla : '');
    
    const newEquipment = {
      ...formData,
      descripcion_falla: fullDescription,
      monto: parseFloat(formData.monto) || 0
    };

    setEquipmentList(prev => [...prev, newEquipment]);
    // Reset wizard for next equipment if needed, but keep client/phone
    setWizardStep(5); // Step 5 is "Summary/Add Another"
    notify("Equipo añadido a la lista", "success");
  };

  const resetWizardForNext = () => {
    setFormData(prev => ({
      ...prev,
      equipo: '',
      falla: '',
      specs: '',
      monto: 0,
      solucion: '',
      tipo_equipo: 'Notebook'
    }));
    setSelectedServices([]);
    setWizardStep(2); // Volver a equipo
  };

  const handleEquipoChange = async (e) => {
    const val = e.target.value;
    setFormData({...formData, equipo: val});
    if (modelos.includes(val)) {
      try {
        const ficha = await window.api.getFicha(val);
        if (ficha) {
          setFormData(prev => ({...prev, equipo: val, specs: ficha}));
          notify("Ficha técnica cargada", "success");
        }
      } catch (err) {}
    }
  };

  const saveAllRecords = async () => {
    try {
      const grupo_id = Date.now().toString();
      const now = new Date().toISOString();
      
      for (const item of equipmentList) {
        await window.api.saveServicio({
          ...item,
          grupo_id,
          fecha: now,
          estado: item.fecha_programada ? 'Programado' : 'Pendiente'
        });
      }

      notify("Registro guardado con éxito", "success");
      setEquipmentList([]);
      setFormData({
        cliente: '', telefono: '', equipo: '', tipo_equipo: 'Notebook',
        falla: '', specs: '', monto: 0, solucion: '', fecha_programada: ''
      });
      setWizardStep(1);
      localStorage.removeItem('mla_draft_registro');
      loadInitialData();
    } catch (error) {
      notify("Error al guardar", "error");
    }
  };

  // --- Kanban Logic ---
  const groupedServicios = useMemo(() => {
    const groups = {};
    servicios.forEach(s => {
      const gid = s.grupo_id || `single-${s.id}`;
      if (!groups[gid]) {
        groups[gid] = { ...s, items: [] };
      }
      groups[gid].items.push(s);
    });
    return Object.values(groups);
  }, [servicios]);

  const updateStatus = async (id, currentStatus, grupo_id) => {
    const states = ['Pendiente', 'Completado', 'Entregado', 'Programado'];
    const nextIdx = (states.indexOf(currentStatus) + 1) % states.length;
    const nextStatus = states[nextIdx];

    try {
      if (grupo_id) await window.api.updateStatusGrupo(grupo_id, nextStatus);
      else await window.api.updateStatus(id, nextStatus);
      notify(`Estado: ${nextStatus}`, "success");
      loadInitialData();
    } catch (err) {
      notify("Error al actualizar estado", "error");
    }
  };

  const deleteRecord = (id, grupo_id) => {
    setDeleteModal({ isOpen: true, id, grupo_id });
  };

  const confirmDelete = async () => {
    try {
      if (deleteModal.grupo_id) await window.api.deleteGrupo(deleteModal.grupo_id);
      else await window.api.deleteServicio(deleteModal.id);
      notify("Registro eliminado", "info");
      loadInitialData();
    } catch (err) {
      notify("Error al eliminar", "error");
    } finally {
      setDeleteModal({ isOpen: false, id: null, grupo_id: null });
    }
  };

  const cancelDelete = () => {
    setDeleteModal({ isOpen: false, id: null, grupo_id: null });
  };

  const generateBoleta = (group) => {
    setBoletaModal({ isOpen: true, group });
  };

  const closeBoleta = () => {
    setBoletaModal({ isOpen: false, group: null });
  };

  const downloadBoleta = async () => {
    if (!boletaRef.current) return;
    try {
      const canvas = await html2canvas(boletaRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const link = document.createElement('a');
      link.download = `boleta-${boletaModal.group?.id}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
      notify("Boleta descargada como imagen", "success");
    } catch (err) {
      notify("Error al generar imagen", "error");
    }
  };

  const downloadReporte = () => {
    try {
      const doc = new jsPDF();
      const now = new Date();
      const monthName = now.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
      
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('MLA Store', 105, 18, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Servicio T\u00E9cnico Profesional', 105, 26, { align: 'center' });
      doc.setFontSize(12);
      doc.text(`Reporte Mensual - ${monthName}`, 105, 34, { align: 'center' });
      
      if (shopConfig.phone) {
        doc.setFontSize(9);
        doc.text(`WhatsApp: +56 ${shopConfig.phone}`, 105, 48, { align: 'center' });
      }
      
      let yPos = shopConfig.phone ? 58 : 52;
      
      const totalRegistros = reporteGroups.length;
      const totalEquipos = reporteGroups.reduce((acc, g) => acc + g.items.length, 0);
      const totalIngresos = reporteGroups.reduce((acc, g) => acc + g.items.reduce((a, c) => a + c.monto, 0), 0);
      const pendientes = reporteGroups.filter(g => g.estado === 'Pendiente' || g.estado === 'Programado').length;
      const completados = reporteGroups.filter(g => g.estado === 'Completado').length;
      const entregados = reporteGroups.filter(g => g.estado === 'Entregado').length;
      
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(14, yPos, 58, 22, 3, 3, 'F');
      doc.roundedRect(76, yPos, 58, 22, 3, 3, 'F');
      doc.roundedRect(138, yPos, 58, 22, 3, 3, 'F');
      
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(String(totalRegistros), 43, yPos + 9, { align: 'center' });
      doc.text(String(totalEquipos), 105, yPos + 9, { align: 'center' });
      doc.text(formatCLP(totalIngresos), 167, yPos + 9, { align: 'center' });
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('REGISTROS', 43, yPos + 17, { align: 'center' });
      doc.text('EQUIPOS', 105, yPos + 17, { align: 'center' });
      doc.text('INGRESOS', 167, yPos + 17, { align: 'center' });
      
      yPos += 32;
      
      doc.setFillColor(254, 243, 199);
      doc.roundedRect(14, yPos, 58, 18, 3, 3, 'F');
      doc.setFillColor(209, 250, 229);
      doc.roundedRect(76, yPos, 58, 18, 3, 3, 'F');
      doc.setFillColor(191, 219, 254);
      doc.roundedRect(138, yPos, 58, 18, 3, 3, 'F');
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(146, 64, 14);
      doc.text(String(pendientes), 43, yPos + 10, { align: 'center' });
      doc.setTextColor(5, 150, 105);
      doc.text(String(completados), 105, yPos + 10, { align: 'center' });
      doc.setTextColor(30, 64, 175);
      doc.text(String(entregados), 167, yPos + 10, { align: 'center' });
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('PENDIENTES', 43, yPos + 15, { align: 'center' });
      doc.text('COMPLETADOS', 105, yPos + 15, { align: 'center' });
      doc.text('ENTREGADOS', 167, yPos + 15, { align: 'center' });
      
      yPos += 28;
      
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Detalle de Servicios', 14, yPos);
      yPos += 8;
      
      const tableData = reporteGroups.map(group => {
        const items = group.items.map(item => {
          let desc = `${item.equipo}`;
          if (item.descripcion_falla) desc += ` | ${item.descripcion_falla}`;
          if (item.solucion) desc += ` | Sol: ${item.solucion}`;
          return desc;
        }).join('\n');
        
        return [
          group.cliente,
          new Date(group.fecha).toLocaleDateString('es-ES'),
          group.telefono || 'N/A',
          group.estado,
          items,
          formatCLP(group.items.reduce((a, c) => a + c.monto, 0))
        ];
      });
      
      autoTable(doc, {
        startY: yPos,
        head: [['Cliente', 'Fecha', 'Tel\u00E9fono', 'Estado', 'Detalle', 'Monto']],
        body: tableData,
        theme: 'grid',
        styles: {
          fontSize: 7,
          cellPadding: 3,
          lineColor: [203, 213, 225],
          lineWidth: 0.3,
        },
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7,
        },
        columnStyles: {
          0: { cellWidth: 30, fontStyle: 'bold' },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 25 },
          3: { cellWidth: 22, halign: 'center' },
          4: { cellWidth: 75 },
          5: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        didParseCell: function(data) {
          if (data.section === 'body' && data.column.index === 3) {
            const val = data.cell.raw;
            if (val === 'Pendiente' || val === 'Programado') {
              data.cell.styles.textColor = [180, 83, 9];
            } else if (val === 'Completado') {
              data.cell.styles.textColor = [5, 150, 105];
            } else if (val === 'Entregado') {
              data.cell.styles.textColor = [30, 64, 175];
            }
          }
        },
        margin: { left: 14, right: 14 },
      });
      
      const finalY = doc.lastAutoTable.finalY + 15;
      const pageHeight = doc.internal.pageSize.height;
      
      if (finalY < pageHeight - 20) {
        doc.setDrawColor(203, 213, 225);
        doc.setLineDashPattern([2, 2], 0);
        doc.line(14, finalY, 196, finalY);
        
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'normal');
        doc.text(`Reporte generado el ${now.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}`, 105, finalY + 8, { align: 'center' });
        doc.text('MLA Store - Servicio T\u00E9cnico Profesional', 105, finalY + 14, { align: 'center' });
      }
      
      doc.save(`reporte-mla-${now.getFullYear()}-${now.getMonth() + 1}.pdf`);
      notify("Reporte PDF descargado", "success");
    } catch (err) {
      console.error('Error generando PDF:', err);
      notify("Error al generar PDF: " + err.message, "error");
    }
  };

  const startEditPrice = (price) => {
    setEditingPrice(price);
    setNewPrice({ concepto: price.concepto, monto: price.monto.toString(), es_paquete: price.es_paquete === 1 });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditPrice = () => {
    setEditingPrice(null);
    setNewPrice({ concepto: '', monto: '', es_paquete: false });
  };

  const generateReporteMensual = () => {
    setReporteModal({ isOpen: true });
  };

  const closeReporte = () => {
    setReporteModal({ isOpen: false });
  };


  const filteredGroups = useMemo(() => {
    if (!dateDesde && !dateHasta) return groupedServicios;
    return groupedServicios.filter(g => {
      const gDate = new Date(g.fecha);
      if (dateDesde && gDate < new Date(dateDesde)) return false;
      if (dateHasta && gDate > new Date(dateHasta + 'T23:59:59')) return false;
      return true;
    });
  }, [groupedServicios, dateDesde, dateHasta]);

  const reporteGroups = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return groupedServicios.filter(g => {
      const gDate = new Date(g.fecha);
      if (dateDesde && gDate < new Date(dateDesde)) return false;
      if (dateHasta && gDate > new Date(dateHasta + 'T23:59:59')) return false;
      return gDate >= monthStart && gDate <= monthEnd;
    });
  }, [groupedServicios, dateDesde, dateHasta]);

  // --- Rendering Helpers ---
  const renderStatusBadge = (status) => {
    const styles = {
      Pendiente: 'bg-amber-100 text-amber-700 border-amber-200',
      Completado: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      Entregado: 'bg-blue-100 text-blue-700 border-blue-200',
      Programado: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${styles[status] || styles.Pendiente}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white z-50">
        <div className="relative w-24 h-24 mb-6">
          <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-t-slate-900 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Package className="w-8 h-8 text-slate-900" />
          </div>
        </div>
        <div className="text-2xl font-black tracking-widest text-slate-900 uppercase">MLA Store</div>
        <div className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-[0.3em]">Cargando recursos...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans antialiased text-slate-900 selection:bg-slate-900 selection:text-white">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col p-8">
        <div className="mb-12">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 text-white p-2.5 rounded-2xl shadow-xl shadow-slate-900/20">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none">MLA Store</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Soporte Técnico Profesional</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group relative ${
                currentView === item.id 
                  ? 'bg-slate-900 text-white shadow-2xl shadow-slate-900/30 translate-x-1' 
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className={`${currentView === item.id ? 'scale-110' : 'group-hover:scale-110'} transition-transform duration-300`}>
                {item.icon}
              </span>
              <span className="font-bold text-sm tracking-tight">{item.label}</span>
              {currentView === item.id && (
                <div className="absolute right-4 w-1.5 h-1.5 bg-white rounded-full"></div>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-3">
             <div className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center font-bold text-slate-400">
                <User className="w-4 h-4" />
             </div>
             <div>
                 <p className="text-xs font-bold">{userName || 'Administrador'}</p>
                <p className="text-[10px] text-slate-400 font-medium">MLA Sucursal 01</p>
             </div>
          </div>
           <div className="mt-6 flex justify-between items-center px-2 text-[10px] font-black tracking-widest uppercase">
             <button onClick={() => checkForUpdates(true)} className={`hover:text-slate-500 transition-colors ${updateInfo.available ? 'text-amber-400' : 'text-slate-300'}`}>
               v{CURRENT_VERSION}{updateInfo.available ? ' (actualización disponible)' : ''}
             </button>
             <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${updateInfo.available ? 'bg-amber-400' : 'bg-green-500'}`}></div>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-12 bg-white/40 backdrop-blur-3xl">
        <header className="flex justify-between items-end mb-12">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-3">
              <div className="w-10 h-px bg-slate-200"></div>
              <span>{navItems.find(i => i.id === currentView)?.label}</span>
            </div>
            <h2 className="text-5xl font-black tracking-tighter text-slate-900">
              {currentView === 'view-registro' ? 'Nuevo Servicio' : 
               currentView === 'view-pendientes' ? 'Tablero de Control' :
               currentView === 'view-historial' ? 'Historial Maestro' :
               currentView === 'view-precios' ? 'Catálogo de Precios' : 'Configuración'}
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-slate-900 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Búsqueda global..." 
                  className="pl-12 pr-6 py-3.5 bg-white border border-slate-200 rounded-[1.25rem] text-sm font-bold focus:ring-4 focus:ring-slate-100 focus:border-slate-300 outline-none w-72 shadow-sm transition-all placeholder:text-slate-200"
                />
            </div>
          </div>
        </header>

        <div className="animate-in fade-in slide-in-from-bottom-10 duration-1000 fill-mode-both">
          {/* VIEW: REGISTRO */}
          {currentView === 'view-registro' && (
            <div className="grid grid-cols-12 gap-10">
              <div className="col-span-8 space-y-8">
                {/* Wizard Header */}
                <div className="flex items-center justify-between px-10">
                   {[1, 2, 3, 4].map(step => (
                     <React.Fragment key={step}>
                        <div className={`flex flex-col items-center gap-3 transition-all duration-500 ${wizardStep >= step ? 'opacity-100' : 'opacity-30'}`}>
                           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${wizardStep === step ? 'bg-slate-900 text-white shadow-xl scale-110' : wizardStep > step ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-white border-2 border-slate-100 text-slate-300'}`}>
                              {wizardStep > step ? <Check className="w-6 h-6 stroke-[3px]" /> : step}
                           </div>
                           <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                             {step === 1 ? 'Cliente' : step === 2 ? 'Equipo' : step === 3 ? 'Servicios' : 'Detalles'}
                           </span>
                        </div>
                        {step < 4 && <div className={`flex-1 h-0.5 rounded-full mx-4 transition-all duration-1000 ${wizardStep > step ? 'bg-emerald-500' : 'bg-slate-100'}`}></div>}
                     </React.Fragment>
                   ))}
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl shadow-slate-200/40 p-12 relative overflow-hidden">
                   {wizardStep === 1 && (
                     <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="grid grid-cols-2 gap-12">
                           <div className="space-y-4">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 ml-1">Nombre Completo</label>
                              <input 
                                value={formData.cliente}
                                onChange={e => setFormData({...formData, cliente: e.target.value})}
                                type="text" 
                                className="w-full text-2xl font-bold bg-transparent border-b-2 border-slate-50 focus:border-slate-900 py-3 outline-none transition-all" 
                                placeholder="Juan Pérez..." 
                              />
                           </div>
                           <div className="space-y-4">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 ml-1">Contacto WhatsApp</label>
                              <div className="flex items-center gap-4">
                                 <span className="text-2xl font-bold text-slate-200">+56</span>
                                 <input 
                                   value={formData.telefono}
                                   onChange={e => setFormData({...formData, telefono: e.target.value})}
                                   type="text" 
                                   className="w-full text-2xl font-bold bg-transparent border-b-2 border-slate-50 focus:border-slate-900 py-3 outline-none transition-all" 
                                   placeholder="9 1234 5678" 
                                 />
                              </div>
                           </div>
                        </div>
                     </div>
                   )}

                   {wizardStep === 2 && (
                     <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="grid grid-cols-3 gap-12">
                           <div className="col-span-2 space-y-4">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 ml-1">Marca / Modelo</label>
                              <input 
                                value={formData.equipo}
                                onChange={handleEquipoChange}
                                list="modelosList"
                                type="text" 
                                className="w-full text-2xl font-bold bg-transparent border-b-2 border-slate-50 focus:border-slate-900 py-3 outline-none transition-all" 
                                placeholder="Ej: Acer Nitro 5..." 
                              />
                              <datalist id="modelosList">
                                {modelos.map((m, idx) => <option key={idx} value={m} />)}
                              </datalist>
                           </div>
                           <div className="space-y-4">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 ml-1">Categoría</label>
                              <select 
                                value={formData.tipo_equipo}
                                onChange={e => setFormData({...formData, tipo_equipo: e.target.value})}
                                className="w-full text-2xl font-bold bg-transparent border-b-2 border-slate-50 focus:border-slate-900 py-3 outline-none transition-all cursor-pointer"
                              >
                                <option>Notebook</option>
                                <option>PC Escritorio</option>
                                <option>Smartphone</option>
                              </select>
                           </div>
                        </div>
                        <div className="space-y-4">
                           <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 ml-1">Ficha Técnica / Specs</label>
                           <textarea 
                             value={formData.specs}
                             onChange={e => setFormData({...formData, specs: e.target.value})}
                             rows="2" 
                             className="w-full text-lg font-medium bg-transparent border-b-2 border-slate-50 focus:border-slate-900 py-3 outline-none transition-all resize-none" 
                             placeholder="RAM, Procesador, Almacenamiento..."
                           />
                        </div>
                     </div>
                   )}

                   {wizardStep === 3 && (
                     <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="grid grid-cols-2 gap-10">
                           <div className="space-y-6">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 ml-1">Selección Rápida</label>
                              <div className="flex flex-wrap gap-3">
                                 {precios.map(p => (
                                   <button 
                                     key={p.id}
                                     onClick={() => {
                                       if (!selectedServices.find(s => s.id === p.id)) {
                                         setSelectedServices([...selectedServices, p]);
                                         setFormData(prev => ({ ...prev, monto: prev.monto + p.monto }));
                                       }
                                     }}
                                     className="px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold hover:bg-slate-900 hover:text-white transition-all active:scale-95 shadow-sm"
                                   >
                                     {p.concepto}
                                   </button>
                                 ))}
                              </div>
                           </div>
                           <div className="bg-slate-50/50 rounded-3xl p-8 border border-slate-100 border-dashed">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-6">Items Seleccionados</label>
                              <div className="space-y-3">
                                 {selectedServices.map((s, idx) => (
                                   <div key={idx} className="flex justify-between items-center bg-white p-3 px-4 rounded-xl shadow-sm border border-slate-100">
                                      <span className="text-sm font-bold">{s.concepto}</span>
                                      <button 
                                        onClick={() => {
                                          setSelectedServices(selectedServices.filter((_, i) => i !== idx));
                                          setFormData(prev => ({ ...prev, monto: prev.monto - s.monto }));
                                        }}
                                        className="text-red-400 hover:text-red-600 p-1"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                   </div>
                                 ))}
                                 {selectedServices.length === 0 && <p className="text-xs font-bold text-slate-300 text-center py-4 uppercase tracking-widest">Ninguno</p>}
                              </div>
                           </div>
                        </div>
                     </div>
                   )}

                   {wizardStep === 4 && (
                     <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="grid grid-cols-2 gap-12">
                           <div className="space-y-4">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 ml-1">Falla Reportada</label>
                              <textarea 
                                value={formData.falla}
                                onChange={e => setFormData({...formData, falla: e.target.value})}
                                rows="3" 
                                className="w-full text-lg font-medium bg-transparent border-b-2 border-slate-50 focus:border-slate-900 py-3 outline-none transition-all resize-none" 
                                placeholder="Describe el problema..."
                              />
                           </div>
                           <div className="space-y-4">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 ml-1">Fecha de Compromiso</label>
                              <input 
                                value={formData.fecha_programada}
                                onChange={e => setFormData({...formData, fecha_programada: e.target.value})}
                                type="date" 
                                className="w-full text-2xl font-bold bg-transparent border-b-2 border-slate-50 focus:border-slate-900 py-3 outline-none transition-all" 
                              />
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed mt-4">
                                Establece una fecha si el cliente requiere entrega programada.
                              </p>
                           </div>
                        </div>
                     </div>
                   )}

                   {wizardStep === 5 && (
                     <div className="flex flex-col items-center justify-center py-10 space-y-8 animate-in zoom-in-95 duration-500">
                        <div className="w-24 h-24 bg-emerald-100 rounded-[2rem] flex items-center justify-center text-emerald-600 shadow-xl shadow-emerald-100">
                           <CheckCircle2 className="w-12 h-12 stroke-[2.5px]" />
                        </div>
                        <div className="text-center">
                           <h3 className="text-2xl font-black tracking-tight">¡Equipo Preparado!</h3>
                           <p className="text-slate-400 font-medium mt-1">El equipo ha sido añadido al resumen del registro.</p>
                        </div>
                        <div className="flex gap-4">
                           <button onClick={resetWizardForNext} className="px-8 py-4 bg-slate-900 text-white rounded-3xl font-black text-sm shadow-xl shadow-slate-900/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                             <Plus className="w-5 h-5" /> Agregar otro equipo
                           </button>
                        </div>
                     </div>
                   )}

                   {/* Wizard Nav */}
                   {wizardStep < 5 && (
                     <div className="mt-16 flex justify-between items-center">
                        <button 
                          onClick={() => setWizardStep(prev => prev - 1)}
                          disabled={wizardStep === 1}
                          className={`px-8 py-4 rounded-2xl font-black text-sm transition-all ${wizardStep === 1 ? 'opacity-0 pointer-events-none' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
                        >
                          Anterior
                        </button>
                        <button 
                          onClick={handleNextStep}
                          className="px-10 py-5 bg-slate-900 text-white rounded-3xl font-black text-lg shadow-2xl shadow-slate-900/30 hover:shadow-slate-900/50 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center gap-3"
                        >
                          {wizardStep === 4 ? 'Añadir a la Lista' : 'Continuar'} <ArrowRight className="w-6 h-6" />
                        </button>
                     </div>
                   )}
                </div>
              </div>

              {/* Sidebar Summary */}
              <div className="col-span-4">
                 <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl p-10 flex flex-col h-full sticky top-12">
                    <div className="flex-1">
                       <div className="flex items-center justify-between mb-10">
                          <h3 className="text-2xl font-black tracking-tight">Resumen</h3>
                          <div className="bg-slate-100 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 shadow-sm">
                            {equipmentList.length} Equipos
                          </div>
                       </div>
                       
                       <div className="space-y-8">
                          <div className="space-y-4">
                             {equipmentList.map((item, i) => (
                               <div key={i} className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center group">
                                  <div>
                                     <p className="text-xs font-black tracking-tight">{item.equipo}</p>
                                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{formatCLP(item.monto)}</p>
                                  </div>
                                  <button onClick={() => setEquipmentList(equipmentList.filter((_, idx) => idx !== i))} className="text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                     <Trash2 className="w-4 h-4" />
                                  </button>
                               </div>
                             ))}
                             {equipmentList.length === 0 && (
                               <div className="py-12 border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center opacity-30 text-center px-6">
                                  <Monitor className="w-10 h-10 mb-4" />
                                  <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">Completa los pasos para ver el resumen</p>
                               </div>
                             )}
                          </div>

                          <div className="pt-8 border-t border-slate-100 space-y-6">
                             <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Inversión Total</span>
                                <span className="text-3xl font-black text-slate-900">{formatCLP(equipmentList.reduce((acc, curr) => acc + curr.monto, 0))}</span>
                             </div>
                             
                             <div className="space-y-3">
                                <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
                                   <div className={`w-2 h-2 rounded-full ${formData.cliente ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                                   Cliente: {formData.cliente || 'No indicado'}
                                </div>
                                <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
                                   <div className={`w-2 h-2 rounded-full ${formData.telefono ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                                   WhatsApp: {formData.telefono ? '+56 ' + formData.telefono : 'No indicado'}
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>

                    <div className="mt-12">
                       <button 
                        disabled={equipmentList.length === 0}
                        onClick={saveAllRecords}
                        className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-lg shadow-2xl shadow-slate-900/30 hover:shadow-slate-900/50 hover:-translate-y-1 active:translate-y-0 disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none disabled:translate-y-0 transition-all flex items-center justify-center gap-4"
                       >
                          <Save className="w-6 h-6 stroke-[2.5px]" /> Finalizar Registro
                       </button>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {/* VIEW: TABLERO (KANBAN) */}
          {currentView === 'view-pendientes' && (
            <div className="grid grid-cols-3 gap-10">
              {['Pendiente', 'Completado', 'Entregado'].map((status) => (
                <div key={status} className="space-y-8">
                  <div className="flex justify-between items-center px-6">
                     <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${status === 'Pendiente' ? 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]' : status === 'Completado' ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.5)]' : 'bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.5)]'}`}></div>
                        <h3 className="text-xl font-black tracking-tight">{status === 'Pendiente' ? 'Por Reparar' : status === 'Completado' ? 'Listo p/ Entrega' : 'Entregados Hoy'}</h3>
                     </div>
                     <span className="bg-white border border-slate-100 text-slate-400 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">
                        {groupedServicios.filter(g => {
                           if (status === 'Pendiente') return g.estado === 'Pendiente' || g.estado === 'Programado';
                           if (status === 'Entregado') {
                              const today = new Date().toLocaleDateString();
                              return g.estado === 'Entregado' && new Date(g.fecha).toLocaleDateString() === today;
                           }
                           return g.estado === status;
                        }).length}
                     </span>
                  </div>

                  <div className="bg-slate-50/50 border border-slate-100 border-dashed rounded-[3rem] p-6 space-y-6 min-h-[600px]">
                    {groupedServicios.filter(g => {
                       if (status === 'Pendiente') return g.estado === 'Pendiente' || g.estado === 'Programado';
                       if (status === 'Entregado') {
                          const today = new Date().toLocaleDateString();
                          return g.estado === 'Entregado' && new Date(g.fecha).toLocaleDateString() === today;
                       }
                       return g.estado === status;
                    }).map(group => (
                      <div key={group.id} className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/40 border border-slate-100 hover:scale-[1.03] hover:shadow-2xl transition-all group cursor-pointer">
                         <div className="flex justify-between items-start mb-4">
                            <div>
                               <h4 className="font-black text-slate-900 tracking-tight">{group.cliente}</h4>
                               <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-0.5">#{group.id.toString().slice(-4)}</p>
                            </div>
                            {renderStatusBadge(group.estado)}
                         </div>
                         
                         <div className="space-y-3 mb-6">
                            {group.items.map((item, i) => (
                               <div key={i} className="flex items-center gap-3 text-xs font-bold text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-100/50">
                                  <Monitor className="w-3 h-3 text-slate-300" /> {item.equipo}
                               </div>
                            ))}
                         </div>

                         <div className="flex justify-between items-center pt-5 border-t border-slate-50">
                            <span className="text-lg font-black text-slate-900">{formatCLP(group.items.reduce((acc, c) => acc + c.monto, 0))}</span>
                            <div className="flex gap-2">
                               <button 
                                onClick={() => updateStatus(group.id, group.estado, group.grupo_id)}
                                className="bg-slate-50 hover:bg-slate-900 hover:text-white p-2.5 rounded-xl transition-all border border-slate-100 shadow-sm"
                               >
                                  <ChevronRight className="w-4 h-4" />
                               </button>
                            </div>
                         </div>
                      </div>
                    ))}
                    
                    {groupedServicios.filter(g => {
                       if (status === 'Pendiente') return g.estado === 'Pendiente' || g.estado === 'Programado';
                       if (status === 'Entregado') {
                          const today = new Date().toLocaleDateString();
                          return g.estado === 'Entregado' && new Date(g.fecha).toLocaleDateString() === today;
                       }
                       return g.estado === status;
                    }).length === 0 && (
                      <div className="py-20 flex flex-col items-center justify-center opacity-10 grayscale scale-75">
                         <Package className="w-16 h-16 mb-4" />
                         <p className="text-xs font-black tracking-[0.3em] uppercase">Vacío</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* VIEW: HISTORIAL */}
          {currentView === 'view-historial' && (
            <div className="space-y-8">
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl p-8 flex items-center justify-between">
                   <div className="flex gap-6">
                      <div className="space-y-1.5">
                         <label className="text-[10px] font-black uppercase text-slate-300 ml-1">Desde</label>
                         <input type="date" value={dateDesde} onChange={e => setDateDesde(e.target.value)} className="bg-slate-50 px-4 py-2 rounded-xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-slate-100" />
                      </div>
                      <div className="space-y-1.5">
                         <label className="text-[10px] font-black uppercase text-slate-300 ml-1">Hasta</label>
                         <input type="date" value={dateHasta} onChange={e => setDateHasta(e.target.value)} className="bg-slate-50 px-4 py-2 rounded-xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-slate-100" />
                      </div>
                      {(dateDesde || dateHasta) && (
                        <button onClick={() => { setDateDesde(''); setDateHasta(''); }} className="self-end px-4 py-2 bg-red-50 text-red-500 rounded-xl text-xs font-bold hover:bg-red-100 transition-all border border-red-100">
                          Limpiar filtros
                        </button>
                      )}
                   </div>
                   <button onClick={generateReporteMensual} className="bg-slate-900 text-white px-6 py-3 rounded-2xl flex items-center gap-3 shadow-lg shadow-slate-900/20 hover:bg-slate-700 transition-all">
                      <Printer className="w-5 h-5" />
                      <span className="text-sm font-bold">Descargar Reporte Mensual</span>
                   </button>
                </div>

                <div className="grid grid-cols-1 gap-6">
                   {filteredGroups.length === 0 && (
                     <div className="py-20 flex flex-col items-center justify-center opacity-30">
                        <History className="w-16 h-16 mb-4" />
                        <p className="text-xs font-black tracking-[0.3em] uppercase">No hay registros en este período</p>
                     </div>
                   )}
                   {filteredGroups.map(group => (
                    <div key={group.id} className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-lg shadow-slate-100 hover:shadow-2xl transition-all group overflow-hidden relative">
                       <div className="flex justify-between items-center">
                          <div className="flex items-center gap-8">
                             <div className="space-y-1">
                                <h4 className="text-xl font-black tracking-tight">{group.cliente}</h4>
                                <div className="flex items-center gap-4">
                                   <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {new Date(group.fecha).toLocaleDateString('es-ES')}</p>
                                   <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5"><Smartphone className="w-3 h-3" /> +56 {group.telefono || 'Sin contacto'}</p>
                                </div>
                             </div>
                             <div className="h-10 w-px bg-slate-100"></div>
                             <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Equipos</p>
                                <div className="flex gap-2">
                                   {group.items.map((item, i) => (
                                     <span key={i} className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-500">{item.equipo}</span>
                                   ))}
                                </div>
                             </div>
                          </div>
                          
                          <div className="flex items-center gap-8 text-right">
                             <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Monto</p>
                                <p className="text-2xl font-black text-slate-900">{formatCLP(group.items.reduce((acc, c) => acc + c.monto, 0))}</p>
                             </div>
                              <div className="flex items-center gap-4 pl-8 border-l border-slate-100">
                                 {renderStatusBadge(group.estado)}
                                 <button onClick={() => generateBoleta(group)} className="p-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-700 transition-all shadow-sm" title="Generar Boleta">
                                    <Printer className="w-5 h-5" />
                                 </button>
                                 <button onClick={() => deleteRecord(group.id, group.grupo_id)} className="p-3 bg-red-50 text-red-500 rounded-2xl border border-red-100 hover:bg-red-500 hover:text-white transition-all shadow-sm">
                                    <Trash2 className="w-5 h-5" />
                                 </button>
                              </div>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {/* VIEW: PRECIOS */}
          {currentView === 'view-precios' && (
            <div className="grid grid-cols-12 gap-10">
               <div className="col-span-4 space-y-8">
                   <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl p-10 space-y-8 sticky top-12">
                      <div className="flex items-center justify-between">
                         <h3 className="text-2xl font-black tracking-tight">{editingPrice ? 'Editar Concepto' : 'Nuevo Concepto'}</h3>
                         {editingPrice && (
                           <button onClick={cancelEditPrice} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all">
                              <X className="w-4 h-4" />
                           </button>
                         )}
                      </div>
                     <div className="space-y-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Descripción</label>
                           <input 
                             value={newPrice.concepto}
                             onChange={e => setNewPrice({...newPrice, concepto: e.target.value})}
                             type="text" 
                             className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-4 focus:ring-slate-100" 
                             placeholder="Ej: Mantención Full..." 
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Monto ($)</label>
                           <input 
                             value={newPrice.monto}
                             onChange={e => setNewPrice({...newPrice, monto: e.target.value})}
                             type="number" 
                             className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-4 focus:ring-slate-100" 
                             placeholder="0" 
                           />
                        </div>
                        <label className="flex items-center gap-4 cursor-pointer group">
                           <div className={`w-12 h-6 rounded-full relative transition-all duration-300 ${newPrice.es_paquete ? 'bg-emerald-500 shadow-lg shadow-emerald-200' : 'bg-slate-200'}`}>
                              <input 
                                type="checkbox" 
                                className="hidden" 
                                checked={newPrice.es_paquete}
                                onChange={e => setNewPrice({...newPrice, es_paquete: e.target.checked})}
                              />
                              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${newPrice.es_paquete ? 'left-7' : 'left-1'}`}></div>
                           </div>
                           <span className="text-xs font-bold text-slate-500">¿Es un paquete / combo?</span>
                        </label>
                         <button 
                           onClick={async () => {
                             if (!newPrice.concepto || !newPrice.monto) return notify("Completa los campos", "error");
                             if (editingPrice) {
                               await window.api.updatePrecio(editingPrice.id, newPrice.concepto, parseFloat(newPrice.monto), newPrice.es_paquete ? 1 : 0);
                               notify("Precio actualizado", "success");
                               setEditingPrice(null);
                             } else {
                               await window.api.savePrecio({ ...newPrice, monto: parseFloat(newPrice.monto), es_paquete: newPrice.es_paquete ? 1 : 0 });
                               notify("Precio guardado", "success");
                             }
                             setNewPrice({ concepto: '', monto: '', es_paquete: false });
                             loadInitialData();
                           }}
                           className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black text-lg shadow-xl shadow-slate-900/20 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-3"
                         >
                            {editingPrice ? <Save className="w-6 h-6" /> : <PlusCircle className="w-6 h-6" />} {editingPrice ? 'Guardar Cambios' : 'Añadir al Catálogo'}
                         </button>
                     </div>
                  </div>
               </div>

               <div className="col-span-8">
                  <div className="grid grid-cols-2 gap-6">
                     {precios.map(p => (
                       <div key={p.id} className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-lg shadow-slate-100 hover:shadow-2xl transition-all relative group overflow-hidden">
                          {p.es_paquete === 1 && (
                            <div className="absolute top-0 right-0 p-3 px-4 bg-slate-900 text-white rounded-bl-3xl flex items-center gap-2">
                               <Package className="w-3 h-3" />
                               <span className="text-[10px] font-black tracking-widest uppercase">Combo</span>
                            </div>
                          )}
                          <h4 className="text-xl font-black tracking-tight text-slate-900 mb-1">{p.concepto}</h4>
                          <p className="text-3xl font-black text-slate-900 mb-8">{formatCLP(p.monto)}</p>
                          <div className="flex justify-between items-center pt-6 border-t border-slate-50">
                             <div className="flex items-center gap-2 text-emerald-500">
                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                <span className="text-[10px] font-black uppercase tracking-widest">Activo</span>
                             </div>
                              <div className="flex gap-2">
                                 <button onClick={() => startEditPrice(p)} className={`p-3 rounded-2xl border transition-all shadow-sm ${editingPrice?.id === p.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-900 hover:text-white'}`}>
                                    <Edit3 className="w-5 h-5" />
                                 </button>
                                <button 
                                  onClick={async () => {
                                    if (confirm("¿Eliminar este precio?")) {
                                      await window.api.deletePrecio(p.id);
                                      notify("Precio eliminado", "info");
                                      loadInitialData();
                                    }
                                  }}
                                  className="p-3 bg-red-50 text-red-500 rounded-2xl border border-red-100 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                >
                                   <Trash2 className="w-5 h-5" />
                                </button>
                             </div>
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
            </div>
          )}

          {/* VIEW: CONFIGURACIÓN */}
          {currentView === 'view-configuracion' && (
            <div className="max-w-3xl mx-auto space-y-10">
               <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl p-12 space-y-12">
                  <div>
                     <h3 className="text-3xl font-black tracking-tight mb-2 italic">Ajustes Globales</h3>
                     <p className="text-slate-400 text-sm font-medium">Personaliza la experiencia y los datos de tu negocio.</p>
                  </div>

                  <div className="space-y-8">
                     <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 ml-1">Nombre de Usuario</label>
                        <div className="flex items-center gap-4 bg-slate-50 rounded-[1.5rem] p-6 border border-slate-100 group focus-within:ring-4 focus-within:ring-slate-100 transition-all">
                           <div className="bg-slate-100 text-slate-400 p-3 rounded-2xl">
                              <User className="w-6 h-6" />
                           </div>
                           <div className="flex-1">
                              <input 
                                value={userName}
                                onChange={e => { setUserName(e.target.value); localStorage.setItem('mla_user_name', e.target.value); }}
                                type="text" 
                                className="w-full bg-transparent text-2xl font-bold outline-none border-none placeholder:text-slate-200" 
                                placeholder="Tu nombre..." 
                              />
                              <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-1">Se mostrará en la barra lateral</p>
                           </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                         <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 ml-1">Actualizaciones</label>
                         <div className="flex items-center justify-between bg-slate-50 rounded-[1.5rem] p-6 border border-slate-100">
                            <div className="flex items-center gap-4">
                               <div className={`p-3 rounded-2xl ${updateInfo.available ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                  <CheckCircle2 className="w-6 h-6" />
                               </div>
                               <div>
                                  <p className="text-sm font-bold text-slate-900">v{CURRENT_VERSION}</p>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{updateInfo.available ? 'Actualización disponible' : 'Última versión'}</p>
                               </div>
                            </div>
                            <button 
                              onClick={() => checkForUpdates(true)}
                              disabled={updateInfo.checking}
                              className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs hover:bg-slate-700 transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                               {updateInfo.checking ? 'Verificando...' : 'Verificar'}
                            </button>
                         </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 ml-1">Teléfono del Negocio (WhatsApp)</label>
                        <div className="flex items-center gap-4 bg-slate-50 rounded-[1.5rem] p-6 border border-slate-100 group focus-within:ring-4 focus-within:ring-slate-100 transition-all">
                           <div className="bg-emerald-100 text-emerald-600 p-3 rounded-2xl">
                              <MessageCircle className="w-6 h-6" />
                           </div>
                           <div className="flex-1">
                              <div className="flex items-center gap-3">
                                 <span className="text-2xl font-bold text-slate-300">+56</span>
                                 <input 
                                   value={shopConfig.phone}
                                   onChange={e => setShopConfig({...shopConfig, phone: e.target.value})}
                                   type="text" 
                                   className="w-full bg-transparent text-2xl font-bold outline-none border-none placeholder:text-slate-200" 
                                   placeholder="9 1234 5678" 
                                 />
                              </div>
                              <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-1">Se usará para el envío automático de tickets</p>
                           </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-4">
                           <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 ml-1">Moneda del Sistema</label>
                           <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-100 flex items-center justify-between">
                              <span className="font-bold text-lg text-slate-900">CLP ($)</span>
                              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                           </div>
                        </div>
                        <div className="space-y-4">
                           <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 ml-1">Idioma de Interfaz</label>
                           <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-100 flex items-center justify-between">
                              <span className="font-bold text-lg text-slate-900">Español</span>
                              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="pt-12 border-t border-slate-100 flex justify-end">
                     <button 
                        onClick={async () => {
                           await window.api.saveSetting('shop_phone', shopConfig.phone);
                           localStorage.setItem('mla_user_name', userName);
                           notify("Configuración guardada", "success");
                        }}
                        className="bg-slate-900 text-white px-10 py-5 rounded-[1.75rem] font-black text-lg shadow-2xl shadow-slate-900/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                     >
                        <Save className="w-6 h-6 stroke-[2.5px]" /> Guardar Cambios
                     </button>
                  </div>
               </div>
               
               <div className="text-center opacity-20 pointer-events-none select-none">
                  <Package className="w-20 h-20 mx-auto mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-[0.5em]">MLA Store Management System</p>
               </div>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="fixed bottom-12 right-12 z-[100] space-y-4 pointer-events-none">
          {notifications.map(n => (
            <div key={n.id} className="pointer-events-auto animate-in slide-in-from-right-10 duration-500 fill-mode-both">
               <div className={`flex items-center gap-5 px-8 py-5 rounded-[1.75rem] shadow-2xl backdrop-blur-xl border ${
                 n.type === 'success' ? 'bg-white/90 border-emerald-100 text-emerald-900' : 
                 n.type === 'error' ? 'bg-white/90 border-red-100 text-red-900' : 
                 'bg-white/90 border-slate-200 text-slate-900'
               }`}>
                  <div className={`p-2 rounded-xl ${
                    n.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 
                    n.type === 'error' ? 'bg-red-100 text-red-600' : 
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {n.type === 'success' ? <CheckCircle2 className="w-5 h-5 stroke-[2.5px]" /> : 
                     n.type === 'error' ? <AlertCircle className="w-5 h-5 stroke-[2.5px]" /> : 
                     <Package className="w-5 h-5 stroke-[2.5px]" />}
                  </div>
                  <div className="pr-4">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-0.5">{n.type === 'success' ? 'Éxito' : n.type === 'error' ? 'Error' : 'Aviso'}</p>
                    <span className="font-bold text-sm tracking-tight">{n.message}</span>
                  </div>
                  <button onClick={() => setNotifications(prev => prev.filter(notif => notif.id !== n.id))} className="ml-4 opacity-50 hover:opacity-100 transition-opacity p-2"><X className="w-4 h-4" /></button>
               </div>
            </div>
          ))}
        </div>
        {/* Delete Modal */}
        {deleteModal.isOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white rounded-[2.5rem] p-10 w-[400px] shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-100">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-[1.5rem] flex items-center justify-center mb-6 mx-auto border border-red-100 shadow-sm">
                   <Trash2 className="w-8 h-8 stroke-[2.5px]" />
                </div>
                <h3 className="text-2xl font-black text-center text-slate-900 tracking-tight mb-2">¿Eliminar registro?</h3>
                <p className="text-center text-sm font-bold text-slate-400 mb-8 px-4 leading-relaxed">Esta acción no se puede deshacer y borrará permanentemente los datos.</p>
                <div className="flex gap-4">
                   <button onClick={cancelDelete} className="flex-1 py-4 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl font-black text-sm transition-all border border-slate-200">Cancelar</button>
                   <button onClick={confirmDelete} className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-red-500/30">Sí, eliminar</button>
                </div>
             </div>
          </div>
        )}
        {/* Boleta Modal */}
        {boletaModal.isOpen && boletaModal.group && (() => {
          const group = boletaModal.group;
          const total = group.items.reduce((acc, c) => acc + c.monto, 0);
          const boletaDate = new Date(group.fecha).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
          const boletaTime = new Date(group.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
          
          return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
               <div className="bg-white rounded-[2rem] w-[520px] shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-100 max-h-[90vh] overflow-y-auto">
                  <div ref={boletaRef} className="p-8">
                     <div className="text-center mb-6 pb-6 border-b-2 border-dashed border-slate-200">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-900 text-white rounded-2xl mb-3">
                           <Package className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-black tracking-tight text-slate-900">MLA Store</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Servicio Técnico Profesional</p>
                        {shopConfig.phone && (
                          <p className="text-xs font-bold text-slate-400 mt-2">WhatsApp: +56 {shopConfig.phone}</p>
                        )}
                     </div>

                     <div className="space-y-4 mb-6 pb-6 border-b-2 border-dashed border-slate-200">
                        <div className="flex justify-between items-center">
                           <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Boleta N°</span>
                           <span className="text-lg font-black text-slate-900">#{group.id.toString().slice(-6)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                           <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fecha</span>
                           <span className="text-sm font-bold text-slate-700">{boletaDate} - {boletaTime}</span>
                        </div>
                        <div className="flex justify-between items-center">
                           <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estado</span>
                           {renderStatusBadge(group.estado)}
                        </div>
                     </div>

                     <div className="space-y-4 mb-6 pb-6 border-b-2 border-dashed border-slate-200">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Datos del Cliente</h3>
                        <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                           <div className="flex justify-between">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nombre</span>
                              <span className="text-sm font-bold text-slate-700">{group.cliente}</span>
                           </div>
                           <div className="flex justify-between">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contacto</span>
                              <span className="text-sm font-bold text-slate-700">+56 {group.telefono || 'No indicado'}</span>
                           </div>
                        </div>
                     </div>

                     <div className="space-y-4 mb-6 pb-6 border-b-2 border-dashed border-slate-200">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Detalle de Servicios</h3>
                        <div className="space-y-3">
                           {group.items.map((item, i) => (
                             <div key={i} className="bg-slate-50 rounded-xl p-4 space-y-2">
                                <div className="flex items-center gap-2 mb-2">
                                   {item.tipo_equipo === 'Smartphone' ? <Smartphone className="w-4 h-4 text-slate-400" /> : 
                                    item.tipo_equipo === 'PC Escritorio' ? <Cpu className="w-4 h-4 text-slate-400" /> : 
                                    <Monitor className="w-4 h-4 text-slate-400" />}
                                   <span className="text-sm font-black text-slate-900">{item.equipo}</span>
                                   <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-100">{item.tipo_equipo || 'N/A'}</span>
                                </div>
                                {item.specs && (
                                  <div className="text-xs font-medium text-slate-500 bg-white rounded-lg p-2 border border-slate-100">
                                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Specs:</span>
                                     {item.specs}
                                  </div>
                                )}
                                {item.descripcion_falla && (
                                  <div className="text-xs font-medium text-slate-600 bg-white rounded-lg p-2 border border-slate-100">
                                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Falla / Trabajo:</span>
                                     {item.descripcion_falla}
                                  </div>
                                )}
                                {item.solucion && (
                                  <div className="text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg p-2 border border-emerald-100">
                                     <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 block mb-1">Solución:</span>
                                     {item.solucion}
                                  </div>
                                )}
                                {group.fecha_programada && (
                                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg p-2 border border-indigo-100">
                                     <Calendar className="w-3 h-3" />
                                     Entrega programada: {new Date(group.fecha_programada).toLocaleDateString('es-ES')}
                                  </div>
                                )}
                                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Monto</span>
                                   <span className="text-lg font-black text-slate-900">{formatCLP(item.monto)}</span>
                                </div>
                             </div>
                           ))}
                        </div>
                     </div>

                     <div className="bg-slate-900 text-white rounded-2xl p-6 mb-6">
                        <div className="flex justify-between items-center">
                           <span className="text-sm font-black uppercase tracking-widest">Total a Pagar</span>
                           <span className="text-3xl font-black">{formatCLP(total)}</span>
                        </div>
                     </div>

                     <div className="text-center space-y-2 pb-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Garantía: 30 días sobre el servicio realizado</p>
                        <p className="text-[10px] font-bold text-slate-300">Gracias por confiar en MLA Store</p>
                     </div>
                  </div>

                  <div className="flex gap-3 p-6 pt-0">
                     <button onClick={closeBoleta} className="flex-1 py-4 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl font-black text-sm transition-all border border-slate-200">
                        Cerrar
                     </button>
                     <button onClick={downloadBoleta} className="flex-1 py-4 bg-slate-900 hover:bg-slate-700 text-white rounded-2xl font-black text-sm transition-all shadow-lg flex items-center justify-center gap-2">
                        <Printer className="w-4 h-4" /> Descargar Imagen
                     </button>
                  </div>
               </div>
            </div>
          );
        })()}
        {/* Onboarding Modal */}
        {showOnboarding && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
             <div className="bg-white rounded-[2.5rem] p-12 w-[480px] shadow-2xl animate-in zoom-in-95 duration-500 border border-slate-100">
                <div className="text-center mb-8">
                   <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-900 text-white rounded-3xl mb-6 shadow-2xl shadow-slate-900/30">
                      <Package className="w-10 h-10" />
                   </div>
                   <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-2">¡Bienvenido!</h2>
                   <p className="text-sm font-bold text-slate-400 leading-relaxed">Configura tu perfil para comenzar a usar MLA Store</p>
                </div>

                <div className="space-y-8">
                   <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 ml-1">¿Cuál es tu nombre?</label>
                      <div className="flex items-center gap-4 bg-slate-50 rounded-[1.5rem] p-6 border border-slate-100 group focus-within:ring-4 focus-within:ring-slate-100 transition-all">
                         <div className="bg-slate-100 text-slate-400 p-3 rounded-2xl">
                            <User className="w-6 h-6" />
                         </div>
                         <input 
                           autoFocus
                           value={onboardingName}
                           onChange={e => setOnboardingName(e.target.value)}
                           onKeyDown={e => e.key === 'Enter' && handleOnboarding()}
                           type="text" 
                           className="w-full bg-transparent text-2xl font-bold outline-none border-none placeholder:text-slate-200" 
                           placeholder="Tu nombre..." 
                         />
                      </div>
                   </div>

                   <button 
                     onClick={handleOnboarding}
                     disabled={!onboardingName.trim()}
                     className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-lg shadow-2xl shadow-slate-900/30 hover:shadow-slate-900/50 hover:-translate-y-1 active:translate-y-0 disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none disabled:translate-y-0 transition-all flex items-center justify-center gap-4"
                   >
                      <ArrowRight className="w-6 h-6" /> Comenzar
                   </button>
                </div>
             </div>
           </div>
        )}
        {/* Update Modal */}
        {showUpdateModal && updateInfo.available && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
             <div className="bg-white rounded-[2.5rem] p-12 w-[480px] shadow-2xl animate-in zoom-in-95 duration-500 border border-slate-100">
                <div className="text-center mb-8">
                   <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl mb-6 shadow-xl shadow-emerald-100">
                      <ArrowRight className="w-10 h-10" />
                   </div>
                   <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-2">¡Actualización disponible!</h2>
                   <p className="text-sm font-bold text-slate-400">Versión {updateInfo.latestVersion}</p>
                </div>

                <div className="space-y-6">
                   <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Notas de la versión</p>
                      <p className="text-sm font-medium text-slate-600 whitespace-pre-wrap leading-relaxed">{updateInfo.releaseNotes}</p>
                   </div>

                   <div className="flex gap-3">
                      <button onClick={() => setShowUpdateModal(false)} className="flex-1 py-4 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl font-black text-sm transition-all border border-slate-200">
                         Ahora no
                      </button>
                      <button onClick={() => { window.open(updateInfo.downloadUrl, '_blank'); setShowUpdateModal(false); }} className="flex-1 py-4 bg-slate-900 hover:bg-slate-700 text-white rounded-2xl font-black text-sm transition-all shadow-lg flex items-center justify-center gap-2">
                         <ArrowRight className="w-4 h-4" /> Descargar
                      </button>
                   </div>
                </div>
             </div>
          </div>
        )}
        {/* Reporte Mensual Modal */}
        {reporteModal.isOpen && (() => {
          const now = new Date();
          const monthName = now.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
          const totalRegistros = reporteGroups.length;
          const totalEquipos = reporteGroups.reduce((acc, g) => acc + g.items.length, 0);
          const totalIngresos = reporteGroups.reduce((acc, g) => acc + g.items.reduce((a, c) => a + c.monto, 0), 0);
          const pendientes = reporteGroups.filter(g => g.estado === 'Pendiente' || g.estado === 'Programado').length;
          const completados = reporteGroups.filter(g => g.estado === 'Completado').length;
          const entregados = reporteGroups.filter(g => g.estado === 'Entregado').length;
          
          return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
               <div className="bg-white rounded-[2rem] w-[700px] shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-100 max-h-[90vh] overflow-y-auto">
                  <div ref={reporteRef} className="p-8">
                     <div className="text-center mb-8 pb-6 border-b-2 border-dashed border-slate-200">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-900 text-white rounded-2xl mb-3">
                           <Package className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-black tracking-tight text-slate-900">MLA Store</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Reporte Mensual de Servicios</p>
                        <p className="text-sm font-black text-slate-700 mt-2 capitalize">{monthName}</p>
                        {shopConfig.phone && (
                          <p className="text-xs font-bold text-slate-400 mt-1">WhatsApp: +56 {shopConfig.phone}</p>
                        )}
                     </div>

                     <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="bg-slate-50 rounded-xl p-4 text-center">
                           <p className="text-2xl font-black text-slate-900">{totalRegistros}</p>
                           <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Registros</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4 text-center">
                           <p className="text-2xl font-black text-slate-900">{totalEquipos}</p>
                           <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Equipos</p>
                        </div>
                        <div className="bg-slate-900 text-white rounded-xl p-4 text-center">
                           <p className="text-2xl font-black">{formatCLP(totalIngresos)}</p>
                           <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Ingresos</p>
                        </div>
                     </div>

                     <div className="grid grid-cols-3 gap-4 mb-8 pb-8 border-b-2 border-dashed border-slate-200">
                        <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-100">
                           <p className="text-xl font-black text-amber-700">{pendientes}</p>
                           <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Pendientes</p>
                        </div>
                        <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-100">
                           <p className="text-xl font-black text-emerald-700">{completados}</p>
                           <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Completados</p>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
                           <p className="text-xl font-black text-blue-700">{entregados}</p>
                           <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Entregados</p>
                        </div>
                     </div>

                     <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-4">Detalle de Servicios</h3>
                     <div className="space-y-4 mb-8">
                        {reporteGroups.map(group => (
                          <div key={group.id} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                             <div className="flex justify-between items-start mb-3">
                                <div>
                                   <p className="text-sm font-black text-slate-900">{group.cliente}</p>
                                   <p className="text-[10px] font-bold text-slate-400">+56 {group.telefono || 'Sin contacto'} | {new Date(group.fecha).toLocaleDateString('es-ES')}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                   {renderStatusBadge(group.estado)}
                                   <span className="text-lg font-black text-slate-900">{formatCLP(group.items.reduce((a, c) => a + c.monto, 0))}</span>
                                </div>
                             </div>
                             <div className="space-y-2">
                                {group.items.map((item, i) => (
                                  <div key={i} className="bg-white rounded-lg p-3 border border-slate-100 text-xs">
                                     <div className="flex justify-between items-center mb-1">
                                        <span className="font-bold text-slate-700">{item.equipo}</span>
                                        <span className="font-black text-slate-900">{formatCLP(item.monto)}</span>
                                     </div>
                                     {item.descripcion_falla && (
                                       <p className="text-slate-500 text-[11px]"><span className="font-bold">Falla:</span> {item.descripcion_falla}</p>
                                     )}
                                     {item.solucion && (
                                       <p className="text-emerald-600 text-[11px]"><span className="font-bold">Solución:</span> {item.solucion}</p>
                                     )}
                                  </div>
                                ))}
                             </div>
                          </div>
                        ))}
                        {reporteGroups.length === 0 && (
                          <div className="py-12 text-center">
                             <p className="text-sm font-bold text-slate-400">No hay registros para este mes</p>
                          </div>
                        )}
                     </div>

                     <div className="text-center pt-6 border-t-2 border-dashed border-slate-200">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reporte generado el {now.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <p className="text-[10px] font-bold text-slate-300 mt-1">MLA Store - Servicio Técnico Profesional</p>
                     </div>
                  </div>

                  <div className="flex gap-3 p-6 pt-0">
                     <button onClick={closeReporte} className="flex-1 py-4 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl font-black text-sm transition-all border border-slate-200">
                        Cerrar
                     </button>
                     <button onClick={downloadReporte} className="flex-1 py-4 bg-slate-900 hover:bg-slate-700 text-white rounded-2xl font-black text-sm transition-all shadow-lg flex items-center justify-center gap-2">
                        <Printer className="w-4 h-4" /> Descargar PDF
                     </button>
                  </div>
               </div>
            </div>
          );
        })()}
      </main>
    </div>
  );
};

export default App;
