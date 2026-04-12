import { useState, useEffect } from 'react';
import { Palette, Upload, Check, Trash2, Layout, Database, TrendingUp, Filter, Search, Package, Save, RefreshCw, Store, User, Users, Lock, Plus, Key, Mail, Phone, MapPin } from 'lucide-react';
import { medicineService } from '@/services/medicineService';
import { categoryService } from '@/services/categoryService';
import { userService } from '@/services/userService';
import { pharmacyService } from '@/services/pharmacyService';
import { toast } from 'sonner';
import { addDoc, collection, serverTimestamp, deleteDoc, doc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

export function Settings({ settings, onUpdateSettings, categories = [], medicines = [], currentUser }) {
  const [localPharmacyName, setLocalPharmacyName] = useState(settings?.pharmacyName || '');
  const [localAddress, setLocalAddress] = useState(settings?.address || '');
  const [localContact, setLocalContact] = useState(settings?.contact || '');
  
  const [generating, setGenerating] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [logoPreview, setLogoPreview] = useState(settings?.logo || null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Staff Creator State
  const [staffName, setStaffName] = useState('');
  const [staffUsername, setStaffUsername] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  // Demo Receipts State
  const [demoMonths, setDemoMonths] = useState('3');
  const [demoSalesCount, setDemoSalesCount] = useState('50');
  const [showDevTools, setShowDevTools] = useState(false);

  useEffect(() => {
    setLocalPharmacyName(settings?.pharmacyName || '');
    setLocalAddress(settings?.address || '');
    setLocalContact(settings?.contact || '');
    setLogoPreview(settings?.logo || null);
    
    if (currentUser?.pharmacyId && currentUser?.role === 'manager') {
      fetchStaff();
    }
  }, [settings, currentUser]);

  const fetchStaff = async () => {
    if (!currentUser?.pharmacyId) return;
    setLoadingStaff(true);
    try {
      const staff = await userService.getStaffMembers(currentUser.pharmacyId);
      // Filter out the current user (manager) from the staff list if desired, 
      // or keep them if they should be visible. Usually, staff management shows OTHERS.
      setStaffList(staff.filter(u => u.uid !== currentUser.uid));
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Failed to load staff members');
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleUpdatePharmacy = async () => {
    try {
      if (!currentUser?.pharmacyId) return;
      
      const updatedFields = {};
      if (localPharmacyName !== settings?.pharmacyName) updatedFields.pharmacyName = localPharmacyName;
      if (localAddress !== settings?.address) updatedFields.address = localAddress;
      if (localContact !== settings?.contact) updatedFields.contact = localContact;

      await pharmacyService.updatePharmacy(currentUser.pharmacyId, {
        name: localPharmacyName,
        address: localAddress,
        contact: localContact
      });
      
      onUpdateSettings?.({ 
        ...settings, 
        pharmacyName: localPharmacyName,
        address: localAddress,
        contact: localContact
      });

      if (Object.keys(updatedFields).length > 0) {
        await auditService.logAction(currentUser.pharmacyId, {
          userId: currentUser.uid,
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'PHARMACY_EDIT',
          entityType: 'settings',
          entityName: 'Pharmacy Profile',
          details: {
            changes: updatedFields,
            before: {
              pharmacyName: settings?.pharmacyName || '',
              address: settings?.address || '',
              contact: settings?.contact || ''
            },
            after: {
              pharmacyName: localPharmacyName || '',
              address: localAddress || '',
              contact: localContact || ''
            }
          }
        });
      }

      toast.success('Pharmacy information updated');
    } catch (error) {
      console.error('Error updating pharmacy:', error);
      toast.error('Failed to update pharmacy information');
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!staffName || !staffUsername || !staffEmail || !staffPassword) {
      toast.error('Please fill in all staff details');
      return;
    }

    setCreatingStaff(true);
    try {
      await userService.createAccount(
        staffName,
        staffUsername,
        staffEmail,
        staffPassword,
        'staff',
        currentUser.pharmacyId
      );
      toast.success(`Staff account created for ${staffName}`);
      setStaffName('');
      setStaffUsername('');
      setStaffEmail('');
      setStaffPassword('');
      fetchStaff(); // Refresh the list
    } catch (error) {
      console.error('Error creating staff:', error);
      toast.error(error.message || 'Failed to create staff account');
    } finally {
      setCreatingStaff(false);
    }
  };

  const handleDeleteStaff = async (uid, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from your staff? This will only delete their Firestore profile.`)) return;
    
    try {
      await userService.deleteStaffMember(uid);
      toast.success(`Staff member ${name} removed`);
      fetchStaff(); // Refresh the list
    } catch (error) {
      console.error('Error deleting staff:', error);
      toast.error('Failed to remove staff member');
    }
  };

  const handlePasswordReset = async () => {
    if (!currentUser?.email) return;
    try {
      await sendPasswordResetEmail(auth, currentUser.email);
      toast.success('Password reset email sent to ' + currentUser.email);
    } catch (error) {
      console.error('Error sending reset email:', error);
      toast.error('Failed to send password reset email');
    }
  };

  const clearInventory = async () => {
    if (!window.confirm('Are you sure you want to clear your entire inventory? This will delete all medicines and categories. This action cannot be undone.')) return;
    
    setClearing(true);
    try {
      const cats = await categoryService.getCategories(currentUser.pharmacyId);
      for (const cat of cats) {
        if (!cat.id) continue;
        const medsRef = collection(db, 'pharmacies', currentUser.pharmacyId, 'categories', cat.id, 'medicines');
        const medsSnap = await getDocs(medsRef);
        const medDeletions = medsSnap.docs.map(mDoc => deleteDoc(doc(db, 'pharmacies', currentUser.pharmacyId, 'categories', cat.id, 'medicines', mDoc.id)));
        await Promise.all(medDeletions);
        await deleteDoc(doc(db, 'pharmacies', currentUser.pharmacyId, 'categories', cat.id));
      }

      const defaultCategories = [
        'Analgesic', 'Antibiotic', 'Antihistamine', 'Antidiabetic', 
        'Antihypertensive', 'Bronchodilator', 'Mucolytic', 'Proton Pump Inhibitor', 
        'Antacid', 'Antidiarrheal', 'Electrolyte', 'Vitamins', 'Cold/Flu', 'Lipid-Lowering'
      ];
      
      for (const catName of defaultCategories) {
        await categoryService.addCategory(currentUser.pharmacyId, catName);
      }

      toast.success('Inventory cleared and default categories reset');
      window.dispatchEvent(new Event('refresh-categories'));
      window.dispatchEvent(new Event('refresh-medicines'));
    } catch (error) {
      console.error('Error clearing inventory:', error);
      toast.error('Failed to clear inventory');
    } finally {
      setClearing(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      toast.error('Logo must be less than 1MB');
      return;
    }
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result;
        setLogoPreview(base64String);
        const colors = await extractThemeColors(base64String);
        onUpdateSettings?.({ 
          ...settings, 
          logo: base64String,
          primaryColor: colors.primary,
          secondaryColor: colors.secondary,
          accentColor: colors.accent
        });
        toast.success('Logo uploaded and theme updated');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
      setIsUploading(false);
    }
  };

  const extractThemeColors = async (base64) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const p1 = ctx.getImageData(img.width * 0.2, img.height * 0.2, 1, 1).data;
        const p2 = ctx.getImageData(img.width * 0.5, img.height * 0.5, 1, 1).data;
        const p3 = ctx.getImageData(img.width * 0.8, img.height * 0.8, 1, 1).data;
        const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
        const isValidColor = (r, g, b) => {
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          return brightness > 40 && brightness < 220;
        };
        const getValidHex = (p) => isValidColor(p[0], p[1], p[2]) ? rgbToHex(p[0], p[1], p[2]) : '#2563eb';
        resolve({ primary: getValidHex(p1), secondary: getValidHex(p2), accent: getValidHex(p3) });
      };
    });
  };

  const generateDemoData = async () => {
    setGenerating(true);
    try {
      const dataset = [
        "Paracetamol (Biogesic) | Analgesic | Tablet 500mg, Syrup 120mg/5ml | Non-Prescription",
        "Paracetamol (Calpol) | Analgesic | Tablet 500mg, Syrup 120mg/5ml | Non-Prescription",
        "Ibuprofen (Advil) | Analgesic | Tablet 200mg, Capsule 400mg | Non-Prescription",
        "Ibuprofen (Motrin) | Analgesic | Tablet 200mg, Capsule 400mg | Non-Prescription",
        "Mefenamic Acid (Ponstan) | Analgesic | Capsule 500mg, Tablet 250mg | Prescription",
        "Mefenamic Acid (Dolfenal) | Analgesic | Capsule 500mg, Tablet 250mg | Prescription",
        "Aspirin (Bayer) | Analgesic | Tablet 80mg, Tablet 325mg | Non-Prescription",
        "Aspirin (Ecotrin) | Analgesic | Tablet 80mg, Tablet 325mg | Non-Prescription",
        "Amoxicillin (Amoxil) | Antibiotic | Capsule 500mg, Suspension 250mg/5ml | Prescription",
        "Amoxicillin (Moxatag) | Antibiotic | Capsule 500mg, Suspension 250mg/5ml | Prescription",
        "Ciprofloxacin (Ciproxin) | Antibiotic | Tablet 500mg, Tablet 250mg | Prescription",
        "Ciprofloxacin (Ciflox) | Antibiotic | Tablet 500mg, Tablet 250mg | Prescription",
        "Azithromycin (Zithromax) | Antibiotic | Tablet 500mg, Suspension 200mg/5ml | Prescription",
        "Azithromycin (Azimed) | Antibiotic | Tablet 500mg, Suspension 200mg/5ml | Prescription",
        "Cephalexin (Keflex) | Antibiotic | Capsule 500mg, Suspension 250mg/5ml | Prescription",
        "Cephalexin (Ceporex) | Antibiotic | Capsule 500mg, Suspension 250mg/5ml | Prescription",
        "Cetirizine (Zyrtec) | Antihistamine | Tablet 10mg, Syrup 5mg/5ml | Non-Prescription",
        "Cetirizine (Alnix) | Antihistamine | Tablet 10mg, Syrup 5mg/5ml | Non-Prescription",
        "Loratadine (Claritin) | Antihistamine | Tablet 10mg, Syrup 5mg/5ml | Non-Prescription",
        "Loratadine (Allerta) | Antihistamine | Tablet 10mg, Syrup 5mg/5ml | Non-Prescription",
        "Diphenhydramine (Benadryl) | Antihistamine | Capsule 25mg, Syrup 12.5mg/5ml | Non-Prescription",
        "Diphenhydramine (Sleepasil) | Antihistamine | Capsule 25mg, Syrup 12.5mg/5ml | Non-Prescription",
        "Metformin (Glucophage) | Antidiabetic | Tablet 500mg, Tablet 850mg | Prescription",
        "Metformin (Formet) | Antidiabetic | Tablet 500mg, Tablet 850mg | Prescription",
        "Gliclazide (Diamicron) | Antidiabetic | Tablet 30mg, Tablet 60mg | Prescription",
        "Gliclazide (Glizid) | Antidiabetic | Tablet 30mg, Tablet 60mg | Prescription",
        "Amlodipine (Norvasc) | Antihypertensive | Tablet 5mg, Tablet 10mg | Prescription",
        "Amlodipine (Amodip) | Antihypertensive | Tablet 5mg, Tablet 10mg | Prescription",
        "Losartan (Cozaar) | Antihypertensive | Tablet 50mg, Tablet 100mg | Prescription",
        "Losartan (Losarid) | Antihypertensive | Tablet 50mg, Tablet 100mg | Prescription",
        "Salbutamol (Ventolin) | Bronchodilator | Inhaler 100mcg, Syrup 2mg/5ml | Prescription",
        "Salbutamol (Asthalin) | Bronchodilator | Inhaler 100mcg, Syrup 2mg/5ml | Prescription",
        "Carbocisteine (Solmux) | Mucolytic | Capsule 500mg, Syrup 250mg/5ml | Non-Prescription",
        "Carbocisteine (Mucodyne) | Mucolytic | Capsule 500mg, Syrup 250mg/5ml | Non-Prescription",
        "Omeprazole (Losec) | Proton Pump Inhibitor | Capsule 20mg, Capsule 40mg | Prescription",
        "Omeprazole (Omepral) | Proton Pump Inhibitor | Capsule 20mg, Capsule 40mg | Prescription",
        "Kremil-S (Kremil-S) | Antacid | Tablet, Suspension | Non-Prescription",
        "Kremil-S (Remacid) | Antacid | Tablet, Suspension | Non-Prescription",
        "Loperamide (Diatabs) | Antidiarrheal | Capsule 2mg, Tablet 2mg | Non-Prescription",
        "Loperamide (Imodium) | Antidiarrheal | Capsule 2mg, Tablet 2mg | Non-Prescription",
        "Oral Rehydration Salts (Hydrite) | Electrolyte | Powder Sachet, Solution | Non-Prescription",
        "Oral Rehydration Salts (Rehydralyte) | Electrolyte | Powder Sachet, Solution | Non-Prescription",
        "Multivitamins (Enervon) | Vitamins | Capsule, Syrup | Vitamins",
        "Multivitamins (Revicon) | Vitamins | Capsule, Syrup | Vitamins",
        "Vitamin C (Cecon) | Vitamins | Tablet 500mg, Capsule 1000mg | Vitamins",
        "Vitamin C (Poten-Cee) | Vitamins | Tablet 500mg, Capsule 1000mg | Vitamins",
        "Vitamin B Complex (Neurobion) | Vitamins | Tablet, Syrup | Vitamins",
        "Vitamin B Complex (Becozym) | Vitamins | Tablet, Syrup | Vitamins",
        "Vitamin D3 (Forti-D) | Vitamins | Capsule 1000 IU, Drops | Vitamins",
        "Vitamin D3 (Sunvit-D3) | Vitamins | Capsule 1000 IU, Drops | Vitamins",
        "Insulin (Humulin) | Antidiabetic | Injection Vial, Pen Cartridge | Prescription",
        "Insulin (Novolin) | Antidiabetic | Injection Vial, Pen Cartridge | Prescription",
        "Atorvastatin (Lipitor) | Lipid-Lowering | Tablet 10mg, Tablet 20mg | Prescription",
        "Atorvastatin (Atorlip) | Lipid-Lowering | Tablet 10mg, Tablet 20mg | Prescription",
        "Phenylephrine + Paracetamol (Neozep) | Cold/Flu | Tablet, Syrup | Non-Prescription",
        "Phenylephrine + Paracetamol (Tuseran) | Cold/Flu | Tablet, Syrup | Non-Prescription",
        "Paracetamol + Phenylephrine (Bioflu) | Cold/Flu | Tablet, Capsule | Non-Prescription",
        "Paracetamol + Phenylephrine (Flanax Cold) | Cold/Flu | Tablet, Capsule | Non-Prescription",
        "Phenylpropanolamine + Chlorphenamine (Decolgen) | Cold/Flu | Tablet, Syrup | Non-Prescription",
        "Phenylpropanolamine + Chlorphenamine (Coldcure) | Cold/Flu | Tablet, Syrup | Non-Prescription"
      ];

      // Re-fetch categories to ensure we have the latest
      const currentCats = await categoryService.getCategories(currentUser.pharmacyId);
      
      let createdCount = 0;
      for (const entry of dataset) {
        const parts = entry.split('|').map(p => p.trim());
        if (parts.length < 4) continue;
        const nameWithBrand = parts[0];
        const category = parts[1];
        const variationsStr = parts[2];
        const tag = parts[3];

        let name = nameWithBrand;
        let brandName = '';
        const brandMatch = nameWithBrand.match(/(.+)\s+\((.+)\)/);
        if (brandMatch) {
          name = brandMatch[1].trim();
          brandName = brandMatch[2].trim();
        }
        const variations = variationsStr.split(',').map(v => v.trim());
        let categoryObj = currentCats.find(c => c.name === category);
        if (!categoryObj) {
          const newCatId = await categoryService.addCategory(currentUser.pharmacyId, category);
          categoryObj = { id: newCatId, name: category };
          currentCats.push(categoryObj);
        }
        if (!categoryObj.id) continue;

        for (const vStr of variations) {
          let dosageForm = vStr;
          let strength = '';
          const strengthMatch = vStr.match(/(.+?)\s+(\d+.*|Sachet|Solution|Vial|Pen|Drops|Forte|Regular.*)/i);
          if (strengthMatch) {
            dosageForm = strengthMatch[1].trim();
            strength = strengthMatch[2].trim();
          }
          const price = Math.round((Math.random() * 18 + 2) * 100) / 100;
          
          // Check if medicine already exists before adding
          let medId;
          const existingMed = await medicineService.findMedicine(
            currentUser.pharmacyId,
            name,
            brandName,
            dosageForm,
            strength
          );

          // Randomize default counts from 5 to 10
          const defaultBlistersPerBox = Math.floor(Math.random() * 6) + 5; // 5-10
          const defaultUnitsPerBlister = Math.floor(Math.random() * 6) + 5; // 5-10

          if (existingMed) {
            medId = existingMed.id;
          } else {
            medId = await medicineService.addMedicine(
              currentUser.pharmacyId,
              categoryObj.id,
              {
                name,
                brandName,
                dosageForm,
                strength,
                unit: dosageForm.toLowerCase().includes('syrup') ? 'bottle' : 'tablets',
                category,
                tag,
                price,
                minStockLevel: 50,
                batches: [],
                totalQuantity: 0,
                defaultBlistersPerBox,
                defaultUnitsPerBlister
              }
            );
          }

          const expDate = new Date();
          const randStatus = Math.random();
          let boxesReceived = 10;
          
          if (randStatus < 0.25) {
            // Out of stock (expired or very low)
            expDate.setMonth(expDate.getMonth() - (Math.floor(Math.random() * 6) + 1));
            boxesReceived = 0;
          } else if (randStatus < 0.5) {
            // Low stock
            expDate.setMonth(expDate.getMonth() + 12);
            boxesReceived = 2; // Low number of boxes
          } else if (randStatus < 0.75) {
            // Normal stock
            expDate.setMonth(expDate.getMonth() + 24);
            boxesReceived = 50;
          } else {
            // Expired stock
            expDate.setMonth(expDate.getMonth() - 12);
            boxesReceived = 20;
          }

          await medicineService.addBatch(
            currentUser.pharmacyId,
            categoryObj.id,
            medId,
            {
              batchNumber: `DEMO-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
              expiryDate: expDate.toISOString().split('T')[0],
              boxesReceived,
              blistersPerBox: defaultBlistersPerBox,
              unitsPerBlister: defaultUnitsPerBlister,
              purchasePrice: Math.round((price * 0.7) * 100) / 100,
              supplier: 'Demo Supplier'
            }
          );
          createdCount++;
        }
      }
      toast.success(`Generated ${createdCount} demo medicines`);
      window.dispatchEvent(new Event('refresh-medicines'));
    } catch (error) {
      console.error('Error generating demo medicines:', error);
      toast.error('Failed to generate demo medicines');
    } finally {
      setGenerating(false);
    }
  };

  const generateDemoReceipts = async () => {
    setGenerating(true);
    try {
      const targetCount = parseInt(demoSalesCount, 10);
      const monthsBack = parseInt(demoMonths, 10);
      
      const currentMeds = await medicineService.getMedicines(currentUser.pharmacyId);
      if (currentMeds.length === 0) {
        toast.error('Generate medicines first before generating receipts');
        setGenerating(false);
        return;
      }

      for (let i = 0; i < targetCount; i++) {
        const randMed = currentMeds[Math.floor(Math.random() * currentMeds.length)];
        const randDays = Math.floor(Math.random() * (monthsBack * 30));
        const date = new Date();
        date.setDate(date.getDate() - randDays);
        
        const qty = Math.floor(Math.random() * 5) + 1;
        const subtotal = qty * (randMed.price || 10);
        
        await addDoc(collection(db, `pharmacies/${currentUser?.pharmacyId}/receipts`), {
          items: [{
            medicineId: randMed.id,
            name: randMed.name,
            brandName: randMed.brandName || '',
            price: randMed.price || 10,
            quantity: qty,
            total: subtotal,
            categoryId: randMed.categoryId || ''
          }],
          subtotal,
          grandTotal: subtotal,
          amountReceived: subtotal,
          change: 0,
          timestamp: Timestamp.fromDate(date),
          staffId: currentUser?.uid,
          staffName: currentUser?.displayName || currentUser?.name || 'System Demo'
        });
      }
      toast.success(`Generated ${targetCount} demo receipts`);
      window.dispatchEvent(new Event('refresh-receipts'));
    } catch (e) {
      toast.error('Failed to generate demo receipts');
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-12">
      <div className="flex items-center gap-3 mb-4 border-b pb-6">
        <Layout className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-card-foreground">System Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your pharmacy workspace, profile, and demo data in one place.</p>
        </div>
      </div>

      {/* 1. Pharmacy Information Section */}
      <section className="bg-card rounded-xl border p-8 shadow-sm space-y-8">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Pharmacy Information</h2>
              <p className="text-xs text-muted-foreground">Branding and contact details for receipts</p>
            </div>
          </div>
          <button
            onClick={handleUpdatePharmacy}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-bold shadow-md"
          >
            <Save className="w-4 h-4" />
            Save Pharmacy Info
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Pharmacy Name</label>
              <div className="relative">
                <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={localPharmacyName}
                  onChange={(e) => setLocalPharmacyName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50/30 outline-none transition-all"
                  placeholder="Enter Pharmacy Name"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Contact Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={localContact}
                  onChange={(e) => setLocalContact(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50/30 outline-none transition-all"
                  placeholder="e.g. +63 912 345 6789"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Business Address</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <textarea
                  value={localAddress}
                  onChange={(e) => setLocalAddress(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50/30 outline-none transition-all min-h-[120px]"
                  placeholder="Full physical address for receipts"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Pharmacy Logo</label>
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 flex flex-col items-center justify-center bg-gray-50/30 gap-6">
              <div className="w-40 h-40 rounded-3xl bg-white shadow-xl border overflow-hidden flex items-center justify-center relative group">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-4" />
                ) : (
                  <Package className="w-16 h-16 text-gray-200" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <p className="text-white text-[10px] font-bold">CLICK TO CHANGE</p>
                </div>
              </div>
              <div className="text-center">
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" id="logo-upload-merged" />
                <label
                  htmlFor="logo-upload-merged"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 cursor-pointer transition-all text-sm font-bold shadow-sm"
                >
                  {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {isUploading ? 'Uploading...' : 'Upload New Logo'}
                </label>
                <p className="mt-3 text-[10px] text-muted-foreground max-w-[200px] mx-auto">
                  Square image (PNG/JPG) max 1MB. System colors will adapt to your logo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. User & Security Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* User Profile */}
        <section className="bg-card rounded-xl border p-8 shadow-sm space-y-8">
          <div className="flex items-center gap-3 border-b pb-4">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">User Profile</h2>
              <p className="text-xs text-muted-foreground">Account identity & access</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-black shadow-lg">
                {currentUser?.name?.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-xl">{currentUser?.name}</h3>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-black uppercase tracking-widest">{currentUser?.role}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Username</label>
                  <div className="bg-gray-100 px-3 py-2 rounded-lg text-sm text-gray-600 font-medium border border-gray-200">{currentUser?.username}</div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Email Address</label>
                  <div className="bg-gray-100 px-3 py-2 rounded-lg text-sm text-gray-600 font-medium border border-gray-200">{currentUser?.email}</div>
                </div>
              </div>

              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-blue-600 uppercase tracking-tighter">Your Pharmacy ID</label>
                  <code className="text-sm font-mono font-black text-blue-800 select-all tracking-tight">{currentUser?.pharmacyId}</code>
                </div>
                <div className="p-2 bg-white rounded-lg border border-blue-200 text-blue-600 shadow-sm">
                   <Key className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Security Settings */}
        <section className="bg-card rounded-xl border p-8 shadow-sm space-y-8">
          <div className="flex items-center gap-3 border-b pb-4">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Security & Access</h2>
              <p className="text-xs text-muted-foreground">Manage your credentials</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="p-6 border border-gray-100 rounded-2xl bg-gray-50/30 space-y-4">
              <div className="flex items-center gap-3">
                 <Mail className="w-5 h-5 text-gray-400" />
                 <h4 className="font-bold text-sm">Reset Your Password</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Clicking the button below will send a secure password reset link to <strong>{currentUser?.email}</strong>. 
                You will be logged out after changing your password.
              </p>
              <button 
                onClick={handlePasswordReset} 
                className="w-full bg-white border border-gray-200 px-4 py-3 rounded-xl hover:bg-gray-50 transition-all text-sm font-black shadow-sm flex items-center justify-center gap-2 group"
              >
                <Key className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" /> 
                Send Reset Link
              </button>
            </div>

            <div className="pt-4 border-t border-gray-100 mt-4">
              <button 
                onClick={() => setShowDevTools(!showDevTools)}
                className="text-[10px] font-bold text-gray-400 hover:text-blue-500 transition-colors uppercase tracking-widest flex items-center gap-2"
              >
                <Database className="w-3 h-3" />
                {showDevTools ? 'Hide' : 'Show'} Developer & Demo Tools
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* 3. Staff Management Section (Managers Only) */}
      {currentUser?.role === 'manager' && (
        <section className="bg-card rounded-xl border p-8 shadow-sm space-y-8">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Staff Management</h2>
                <p className="text-xs text-muted-foreground">Manage accounts for your pharmacy team</p>
              </div>
            </div>
            <button
              onClick={fetchStaff}
              disabled={loadingStaff}
              className="p-2 text-gray-400 hover:text-emerald-600 transition-colors"
              title="Refresh staff list"
            >
              <RefreshCw className={`w-4 h-4 ${loadingStaff ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Create Staff Form */}
            <div className="lg:col-span-1 bg-gray-50/50 p-6 rounded-xl border border-gray-100 space-y-6">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                Add New Staff
              </h3>
              <form onSubmit={handleCreateStaff} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase">Full Name</label>
                  <input type="text" value={staffName} onChange={(e) => setStaffName(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white" placeholder="Juan Dela Cruz" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase">Username</label>
                  <input type="text" value={staffUsername} onChange={(e) => setStaffUsername(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white" placeholder="juan_staff" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase">Email Address</label>
                  <input type="email" value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white" placeholder="juan@email.com" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase">Initial Password</label>
                  <input type="password" value={staffPassword} onChange={(e) => setStaffPassword(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white" placeholder="Min. 6 characters" />
                </div>
                <button type="submit" disabled={creatingStaff} className="w-full bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition-all font-bold text-sm shadow-md disabled:bg-gray-300 flex items-center justify-center gap-2">
                  {creatingStaff ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {creatingStaff ? 'Creating...' : 'Create Account'}
                </button>
              </form>
            </div>

            {/* Staff List */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                Registered Staff ({staffList.length})
              </h3>
              
              <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 font-bold text-muted-foreground uppercase text-[10px]">Staff Name</th>
                      <th className="px-4 py-3 font-bold text-muted-foreground uppercase text-[10px]">Username</th>
                      <th className="px-4 py-3 font-bold text-muted-foreground uppercase text-[10px]">Email</th>
                      <th className="px-4 py-3 font-bold text-muted-foreground uppercase text-[10px] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {loadingStaff ? (
                      <tr>
                        <td colSpan="4" className="px-4 py-10 text-center text-muted-foreground">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 opacity-20" />
                          Loading staff members...
                        </td>
                      </tr>
                    ) : staffList.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-4 py-10 text-center text-muted-foreground">
                          No staff accounts found. Create one to get started.
                        </td>
                      </tr>
                    ) : (
                      staffList.map((staff) => (
                        <tr key={staff.uid} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold">{staff.name}</div>
                            <div className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">{staff.role}</div>
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-600">@{staff.username}</td>
                          <td className="px-4 py-3 text-gray-500">{staff.email}</td>
                          <td className="px-4 py-3 text-right">
                            <button 
                              onClick={() => handleDeleteStaff(staff.uid, staff.name)}
                              className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                              title="Delete staff member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4. Demo Data Tools (Managers Only) */}
      {currentUser?.role === 'manager' && showDevTools && (
        <section className="bg-card rounded-xl border p-8 shadow-sm border-amber-200 bg-amber-50/5 space-y-8 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 border-b border-amber-200 pb-4">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Developer & Demo Tools</h2>
              <p className="text-xs text-muted-foreground text-amber-700">Tools to populate your pharmacy workspace with demo data</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Medicine Generator */}
            <div className="space-y-4 bg-white p-6 rounded-2xl border border-blue-100 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                 <Package className="w-6 h-6 text-blue-600" />
                 <h3 className="font-bold text-blue-900">Medicine Generator</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Generates the <strong>complete dataset of 60+ medicines</strong> with their brand variations (Biogesic, Calpol, etc.) and multiple dosage forms.
              </p>
              <button 
                onClick={generateDemoData} 
                disabled={generating} 
                className="w-full bg-blue-600 text-white px-6 py-4 rounded-xl hover:bg-blue-700 font-black transition-all disabled:bg-gray-300 flex items-center justify-center gap-2 shadow-md"
              >
                {generating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                Generate All Medicines & Brands
              </button>
            </div>

            {/* Receipt Generator */}
            <div className="space-y-4 bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                 <TrendingUp className="w-6 h-6 text-emerald-600" />
                 <h3 className="font-bold text-emerald-900">Historical Sales Generator</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-emerald-600 uppercase mb-1">Timeframe</label>
                  <select value={demoMonths} onChange={(e) => setDemoMonths(e.target.value)} className="w-full text-xs font-bold p-2.5 border border-emerald-100 rounded-lg bg-emerald-50/30">
                    <option value="1">Past 1 Month</option>
                    <option value="3">Past 3 Months</option>
                    <option value="6">Past 6 Months</option>
                    <option value="12">Past 12 Months</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-emerald-600 uppercase mb-1">Receipts</label>
                  <input type="number" value={demoSalesCount} onChange={(e) => setDemoSalesCount(e.target.value)} className="w-full text-xs font-bold p-2 border border-emerald-100 rounded-lg bg-emerald-50/30" />
                </div>
              </div>
              <button 
                onClick={generateDemoReceipts} 
                disabled={generating || medicines.length === 0} 
                className="w-full bg-emerald-600 text-white px-6 py-4 rounded-xl hover:bg-emerald-700 font-black transition-all disabled:bg-gray-300 flex items-center justify-center gap-2 shadow-md"
              >
                {generating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                Generate Sales History
              </button>
            </div>

            {/* Reset Inventory */}
            <div className="md:col-span-2 p-6 border border-red-200 rounded-2xl bg-red-50/50 flex items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-xl text-red-600 border border-red-100 shadow-sm">
                   <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-red-900">Factory Reset Inventory</h3>
                  <p className="text-xs text-red-600/70 font-medium max-w-md">This will permanently delete all medicines, categories, and inventory data for this pharmacy. This action cannot be undone.</p>
                </div>
              </div>
              <button onClick={clearInventory} disabled={clearing} className="bg-red-600 text-white px-8 py-3 rounded-xl hover:bg-red-700 font-black text-sm transition-all disabled:bg-gray-300 flex items-center gap-2 shadow-lg">
                {clearing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Wipe All Data
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
