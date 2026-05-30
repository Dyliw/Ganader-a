import React, {useState, useEffect} from "react";
import { useParams } from "react-router-dom";
import { animalesApi } from "../../api/animalesApi";

export default function RegistrarPeso({arete, onClose, onSucces}){
    const [form, setForm] = useState({
        peso: '',
    fecha: new Date().toISOString().split('T')[0]
    }
    );
    const [cargando, setCargando] = useState(false);

    const handleSubmit = async (e)=>{
        e.preventDefault();
        setCargando(true);
        try{
            await animalesApi.registrarPeso(arete, {
                peso: parseFloat(form.pes),
                fecha: form.fecha
            });
            onSucces();
            onClose();
        } catch(error){
            alert('Error al cargar los datos');
        }finally{
            setCargando(false);
        }
    };
    return(
        <div className="fixed insert-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96">
                <h2 className="text-xl font-bold mb-4">Registar peso - {arete}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm mb-1">Peso kg</label>
                        <input
                        type="number"
                        step=".1"
                        value={form.peso}
                        onChange={e=>setForm({...form, peso:e.target.value})}
                        className="w-full border rounded p-2"
                        required
                        autoFocus
                        ></input>
                    </div>
                    <div>
                    <label className="block text-sm mb-1">Fecha</label>
                    <input
                    type="date"
                    value={form.fecha}
                    onChange={e => setForm({...form, fecha:e.target.value})}></input>


                    </div>
                    <div className="flex gap-2 justify-end">
                        <button type="button" oncClick={onClose} className="px-4 py-2 border rounded">
                            Cancelar
                        </button>
                        <button type="submit" disabled={cargando} className="px-4 py-2 bg-green-600 text-white rounded">
                            {cargando ? 'Guardando' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>

        </div>
    );
}
