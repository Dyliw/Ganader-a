import React, { useState, useEffect} from "react";
import { recepcionApi } from "../../api/recepcionApi";

export default function RegistrarLote(){
    const[form, setForm] = useState({
        arete_inicial: '',
        arete_final:'',
        sexo:'macho',
        peso_promedio: '',
        meses_promedio:'',
        precio_compra:'',
        id_proveedor: '',
        id_corral: ''
    });

    const [proveedores, setProveedores]= useState([]);
    const [corrales, setCorrales]=useState([]);
    const [resultado, setResultado] = useState(null);
    const [cargando, setCargando]= useState(false);

    useEffect(()=>{
        recepcionApi.getProveedores().then(res => setProveedores(res.data));
        recepcionApi.getCorralesDisponibles().then(res=> setCorrales(res.data));
    }, []);

    const manejarCambio=(e) =>{
        setForm(prev=>({...prev, [e.target.name]: e.target.value}));
    };

    //Vista previa de los aretes
    const generarPreview = () =>{
     if (!form.arete_inicial || !form.arete_final) return [];
    
    // Extraer prefijo y números
    const matchInicial = form.arete_inicial.match(/^(.+?)(\d+)$/);
    const matchFinal = form.arete_final.match(/^(.+?)(\d+)$/);
    
    if (!matchInicial || !matchFinal) return [];
    if (matchInicial[1] !== matchFinal[1]) return ['Prefijos diferentes'];
    
        const inicio = parseInt(matchInicial[2]);
        const fin = parseInt (matchFinal[2]);
        const total = fin- inicio +1;

        if(total>100) return ['No se pueden previsualizar más de 100 aretes'];
        if(total <=0) return ['Rango inválido'];

        //mostrar los primeros 10  y los últimos 3
        const preview =[];
        for(let i=inicio; i<=Math.min(inicio+9, fin); i++){
            preview.push(`${matchInicial[1]}${String(i).padStart(matchInicial[2].length, '0')}`);

        }
        if(total>13) preview.push('...');
        for(let i = Math.max(inicio + 10, fin-2); i<=fin; i++){
            preview.push(`${matchInicial[1]}${String(i).padStart(matchInicial[2].length, '0')}`);
        }
        return preview;
    };
    const manejarEnvio = async (e)=>{
        e.preventDefault();
        setCargando(true);
        try{
            const datos={
                ...form,
                peso_promedio: parseFloat(form.peso_promedio),
                meses_promedio: parseInt(form.meses_promedio),
                precio_compra: parseFloat(form.precio_compra),
                id_proveedor: parseInt(form.id_proveedor),
                id_corral: form.id_corral ? parseInt (form.id_corral): null
            };
            const res = await recepcionApi.registrarRango(datos);
            setResultado(res.data);

        } catch(error){
            setResultado({
                mensaje: 'Error',
                errores: [error.response?.data?.detail || 'Error desconocido']
            });
        }finally{
            setCargando(false);
        }
    };

    const preview=generarPreview();

    return(
        <div>
                <h2 className="text-xl font-semibold mb-4">Registra Lote de animales</h2>
                {resultado && (
            <div className={`p-4 mb-4 rounded ${resultado.errores?.length ? 'bg-yellow-100' : 'bg-green-100'}`}>
            <p className="font-bold">{resultado.mensaje}</p>
            {resultado.registrados && (
                <p>✅ Registrados: {resultado.registrados}</p>
            )}
            {resultado.errores?.length > 0 && (
                <ul className="list-disc pl-5 mt-2">
                {resultado.errores.map((err, i) => (
                    <li key={i} className="text-red-700">{err}</li>
                ))}
                </ul>
            )}
            </div>
            )}

            <form onSubmit={manejarEnvio} className="space-y-4 max-w-2x1">
                <div className="grid grid-cols-2 gap-4">
                    <label className="block text-sm font-medium mb-1">Arete inicial</label>
                    <input
                    type="text"
                    name="arete_inicial"
                    value={form.arete_inicial}
                    onChange={manejarCambio}
                    className="w-full border rounded p-2"
                    placeholder="Ej_ BOV-001"
                    required
                    ></input>
                </div>
                 <div>
                    <label className="block text-sm font-medium mb-1">Arete final</label>
                    <input
                    type="text"
                    name="arete_final"
                    value={form.arete_final}
                    onChange={manejarCambio}
                    className="w-full border rounded p-2"
                    placeholder="Ej_ BOV-001"
                    required
                    ></input>
                </div>

                {preview.length > 0 &&(
                    <div className="bg-gray-50 p-3 rounded">
                        <p className="text-sm font-medium mb-2">
                            Vista previa ({preview.filter(a=>a !== '...').length} animales):
                        </p>
                        <div className="flex flex-wrap gap-1">
                            {preview.map((arete, i)=>(
                                <span key={i} className="bg-white border px-2 py-1 rounded text-xs">
                                    {arete}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1"> Sexo</label>
                        <select name="sexo" value={form.sexo} onChange={manejarCambio} className="w-full border rounded p-2">
                            <option value="macho">Macho</option>
                            <option value="hembra">Hembra</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Peso Promedio</label>
                        <input type="number" name="peso_promedio" value={form.peso_promedio} onChange={manejarCambio} className="w-full border rounded p-2" required>
                        </input>

                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Meses promedio</label>
                        <input type="number" name="meses_promedio" value={form.meses_promedio} onChange={manejarCambio} className="w-full border rounded p-2" required></input>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Precio unitario</label>
                        <input type="number" name="precio_compra" value={form.precio_compra} onChange={manejarCambio} className="w-full border rounded p-2" required></input>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Proveedor</label>
                        <select name="id_proveedor" value={form.id_proveedor} onChange={manejarCambio} className="w-full border rounded p-2" required>
                            <option value="">Seleccionar</option>
                            {proveedores.map(p=>(
                                <option key={p.id_proveedor} value={p.id_proveedor}>{p.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Corral</label>
                        <select name="id_corral" value={form.id_corral} onChange={manejarCambio} className="w-full border rounded p-2">
                            <option value="">Sin asignar</option>
                            {corrales.map(c=>(
                                <option key={c.id_corral} value={c.id_corral}>{c.nombre}{c.disponibles} </option>
                            ))}
                        </select>
                     
                    </div>
                </div>
                <button type="submit" disabled={cargando} className="w-full bg-green-600 text-white py-3 rounded hover:bg-green-700 disabled:opacity-50 text-lg">
                    {cargando ? 'Registrando lotes...' : 'Registrar lote completo'}
                </button>
            </form>
        </div>
            
    );
}
