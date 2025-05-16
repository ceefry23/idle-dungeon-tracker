import React, { useState, useEffect, useRef } from "react";
import Select from "react-select";
import { toPng } from "html-to-image";

// ---- Use your image! ----
import banner from "./assets/dungeon_banner.png"; // <- This is the path to your image
// (rename your file as needed!)

const DUNGEONS = [
  { name: "The Nexus", cost: 500 },
  { name: "Forsaken Crypt", cost: 300 },
  { name: "Goblin Den", cost: 150 },
  { name: "Dragon's Lair", cost: 700 },
  { name: "Shadow Temple", cost: 400 },
];

const DROP_OPTIONS = [
  "Excalibur", "Moonlance", "Divinity", "Fortune", "Fists of Fury",
  "Moonshadow Vestment", "Corruption", "Bloodforged Legguards",
  "Direllas Protection", "Bloodforged Boots", "Phoenix Boots",
  "Fatebreaker Footguards", "Glimmersteel Ward", "Colossus",
  "Earth Destroyer", "Forest Reaver", "Alchemy Chest",
];

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function App() {
  const [characters, setCharacters] = useState(() => {
    const saved = localStorage.getItem("dungeonCharacters");
    return saved ? JSON.parse(saved) : ["Main"];
  });
  const [selectedChar, setSelectedChar] = useState(() => {
    const saved = localStorage.getItem("selectedCharacter");
    if (saved) return saved;
    const chars = localStorage.getItem("dungeonCharacters");
    return chars ? JSON.parse(chars)[0] : "Main";
  });
  const [newChar, setNewChar] = useState("");
  const [runs, setRuns] = useState(() => {
    const saved = localStorage.getItem("dungeonRuns");
    return saved ? JSON.parse(saved) : [];
  });

  const [form, setForm] = useState({
    character: "",
    dungeon: "",
    drops: [],
    cost: "",
    date: getToday(),
  });
  const [filter, setFilter] = useState({ dungeon: "", drop: "__allruns" });
  const [sort, setSort] = useState({ field: "date", asc: false });
  const [deletedRun, setDeletedRun] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editProfit, setEditProfit] = useState("");

  // For image export
  const tableRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("dungeonCharacters", JSON.stringify(characters));
  }, [characters]);
  useEffect(() => {
    localStorage.setItem("selectedCharacter", selectedChar);
  }, [selectedChar]);
  useEffect(() => {
    localStorage.setItem("dungeonRuns", JSON.stringify(runs));
  }, [runs]);
  useEffect(() => {
    setForm((f) => ({ ...f, character: selectedChar }));
  }, [selectedChar]);

  function handleFormChange(e) {
    const { name, value, type, checked } = e.target;
    if (name === "dungeon") {
      const dungeonObj = DUNGEONS.find((d) => d.name === value);
      setForm((f) => ({
        ...f,
        dungeon: value,
        cost: dungeonObj ? dungeonObj.cost : "",
      }));
    } else if (type === "checkbox") {
      setForm((f) => ({ ...f, [name]: checked }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  }

  function handleAddRun(e) {
    e.preventDefault();
    if (!form.dungeon || !form.date || !selectedChar) return;
    setRuns((r) => [
      ...r,
      {
        ...form,
        character: selectedChar,
        id: Date.now(),
      },
    ]);
    setForm({
      character: selectedChar,
      dungeon: "",
      drops: [],
      cost: "",
      date: getToday(),
    });
  }

  function handleDelete(id) {
    const toDelete = runs.find((r) => r.id === id);
    setDeletedRun(toDelete);
    setRuns((r) => r.filter((run) => run.id !== id));
  }

  function handleUndoDelete() {
    if (deletedRun) {
      setRuns((r) => [...r, deletedRun]);
      setDeletedRun(null);
    }
  }

  function handleExportCSV() {
    const headers = ["Character", "Dungeon", "Drops", "Cost", "Profit", "Date"];
    const rows = runs.map((r) => [
      r.character,
      r.dungeon,
      r.drops.join("; "),
      r.cost,
      r.profit,
      r.date,
    ]);
    const csv =
      [headers, ...rows].map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dungeon_runs.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportImage() {
    if (tableRef.current) {
      tableRef.current.classList.add("exporting-image");
      toPng(tableRef.current, { cacheBust: true, backgroundColor: "#111827" })
        .then((dataUrl) => {
          tableRef.current.classList.remove("exporting-image");
          const link = document.createElement("a");
          link.download = `dungeon_report_${new Date().toISOString().slice(0,10)}.png`;
          link.href = dataUrl;
          link.click();
        })
        .catch((err) => {
          tableRef.current.classList.remove("exporting-image");
          alert('Failed to generate image: ' + err.message);
        });
    }
  }

  function filteredRuns() {
    let out = runs;
    if (selectedChar && selectedChar !== "__allchars") {
      out = out.filter((r) => r.character === selectedChar);
    }
    if (filter.dungeon) {
      out = out.filter((r) => r.dungeon === filter.dungeon);
    }
    if (filter.drop === "__alldrops") {
      out = out.filter((r) => r.drops && r.drops.length > 0);
    } else if (filter.drop && filter.drop !== "__allruns") {
      out = out.filter((r) => r.drops && r.drops.includes(filter.drop));
    }
    return out;
  }

  function sortedRuns() {
    const rs = [...filteredRuns()];
    rs.sort((a, b) => {
      let vA = a[sort.field];
      let vB = b[sort.field];

      if (sort.field === "drops") {
        const aHasDrops = a.drops && a.drops.length > 0;
        const bHasDrops = b.drops && b.drops.length > 0;
        if (!aHasDrops && bHasDrops) return 1;
        if (aHasDrops && !bHasDrops) return -1;
        if (!aHasDrops && !bHasDrops) return 0;
        vA = a.drops.join(", ");
        vB = b.drops.join(", ");
      }
      if (sort.field === "character") {
        vA = (a.character || "").toLowerCase();
        vB = (b.character || "").toLowerCase();
      }
      if (sort.field === "cost" || sort.field === "profit") {
        vA = Number(vA) || 0;
        vB = Number(vB) || 0;
      }
      if (vA < vB) return sort.asc ? -1 : 1;
      if (vA > vB) return sort.asc ? 1 : -1;
      return 0;
    });
    return rs;
  }

  function handleSort(field) {
    setSort((s) =>
      s.field === field ? { field, asc: !s.asc } : { field, asc: true }
    );
  }

  function startEditProfit(run) {
    setEditId(run.id);
    setEditProfit(run.profit || "");
  }

  function saveEditProfit(run) {
    setRuns((r) =>
      r.map((rr) =>
        rr.id === run.id
          ? { ...rr, profit: editProfit }
          : rr
      )
    );
    setEditId(null);
    setEditProfit("");
  }

  function cancelEditProfit() {
    setEditId(null);
    setEditProfit("");
  }

  // Totals for displayed (filtered) runs
  const numRuns = filteredRuns().length;
  const totalCost = filteredRuns().reduce((sum, r) => sum + Number(r.cost || 0), 0);
  const totalProfit = filteredRuns().reduce((sum, r) => sum + Number(r.profit || 0), 0);

  function handleRemoveChar(char) {
    if (!window.confirm(`Remove character "${char}"? All their runs will be kept but not filterable.`)) return;
    setCharacters(chars => chars.filter(c => c !== char));
    if (selectedChar === char) {
      setSelectedChar(characters.filter(c => c !== char)[0] || "");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-900 text-gray-100 py-6 px-2">
      <div className="max-w-5xl mx-auto">

        {/* ---- Replace text header with banner image ---- */}
   <img
  src={banner}
  alt="IdleMMO Dungeon Tracker"
  className="mx-auto mb-8 rounded-xl shadow-lg w-full max-w-3xl h-auto"
/>



        {/* Character Selector & Manager */}
        <div className="bg-gray-800/80 p-5 rounded-2xl shadow-lg mb-8 flex flex-col sm:flex-row gap-4 items-center justify-between border border-gray-700">
          <div>
            <label className="text-yellow-300 font-bold mr-2">Character:</label>
            <select
              className="rounded-lg p-2 bg-gray-900 text-gray-100 shadow-inner border border-gray-700 focus:ring-2 focus:ring-yellow-400"
              value={selectedChar}
              onChange={e => setSelectedChar(e.target.value)}
            >
              {characters.map(char => (
                <option key={char} value={char}>{char}</option>
              ))}
              <option value="__allchars">All Characters</option>
            </select>
          </div>
          <form
            className="flex gap-2"
            onSubmit={e => {
              e.preventDefault();
              const cleanChar = newChar.trim();
              if (cleanChar && !characters.includes(cleanChar)) {
                setCharacters(chars => [...chars, cleanChar]);
                setSelectedChar(cleanChar);
                setNewChar("");
              }
            }}
          >
            <input
              type="text"
              className="rounded-lg p-2 bg-gray-900 text-gray-100 border border-gray-700 shadow-inner"
              placeholder="Add character"
              value={newChar}
              onChange={e => setNewChar(e.target.value)}
              maxLength={20}
            />
            <button
              type="submit"
              className="bg-yellow-400 text-gray-900 font-bold rounded-lg px-4 py-2 shadow-md hover:bg-yellow-300 transition-all"
            >
              Add
            </button>
          </form>
          <div className="flex flex-wrap gap-2">
            {characters.length > 1 && characters.map(char =>
              <button
                key={char}
                className="text-xs bg-red-600 text-white rounded-lg px-3 py-1 hover:bg-red-400 transition-all border border-gray-800"
                title={`Remove ${char}`}
                onClick={() => handleRemoveChar(char)}
                type="button"
              >
                Remove {char}
              </button>
            )}
          </div>
        </div>

        {/* Add Dungeon Run Form */}
        <form
          className="bg-gray-800/90 p-7 rounded-2xl shadow-xl mb-8 flex flex-col gap-4 border border-gray-700"
          onSubmit={handleAddRun}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Dungeon Dropdown */}
            <div>
              <label className="block mb-1 text-yellow-300 font-semibold">Dungeon</label>
              <select
                className="w-full rounded-lg p-2 bg-gray-900 text-gray-100 shadow-inner border border-gray-700 focus:ring-2 focus:ring-yellow-400"
                name="dungeon"
                value={form.dungeon}
                onChange={handleFormChange}
                required
              >
                <option value="">Select dungeon</option>
                {DUNGEONS.map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.name} ({d.cost} coins)
                  </option>
                ))}
              </select>
            </div>
            {/* Date Picker */}
            <div>
              <label className="block mb-1 text-yellow-300 font-semibold">Date</label>
              <input
                type="date"
                className="w-full rounded-lg p-2 bg-gray-900 text-gray-100 border border-gray-700 shadow-inner"
                name="date"
                value={form.date}
                onChange={handleFormChange}
                required
              />
            </div>
            {/* Item Drops Multi-Select */}
            <div>
              <label className="block mb-1 text-yellow-300 font-semibold">Item Drops</label>
              <Select
                isMulti
                name="drops"
                className="basic-multi-select text-gray-900"
                classNamePrefix="select"
                options={DROP_OPTIONS.map(item => ({ label: item, value: item }))}
                value={DROP_OPTIONS
                  .filter(item => form.drops.includes(item))
                  .map(item => ({ label: item, value: item }))}
                onChange={selected => setForm(f => ({
                  ...f,
                  drops: selected ? selected.map(s => s.value) : [],
                }))}
                placeholder="Select drops"
                styles={{
                  control: (provided) => ({
                    ...provided,
                    backgroundColor: '#1a202c',
                    borderColor: '#4b5563',
                    color: '#f3f4f6',
                  }),
                  menu: (provided) => ({
                    ...provided,
                    backgroundColor: '#1a202c',
                    color: '#f3f4f6',
                  }),
                  option: (provided, state) => ({
                    ...provided,
                    backgroundColor: state.isFocused ? '#374151' : '#1a202c',
                    color: state.isFocused ? '#fde68a' : '#f3f4f6',
                  }),
                  multiValue: (provided) => ({
                    ...provided,
                    backgroundColor: '#fde68a',
                    color: '#1a202c',
                  }),
                  multiValueLabel: (provided) => ({
                    ...provided,
                    color: '#1a202c',
                  }),
                  input: (provided) => ({
                    ...provided,
                    color: '#f3f4f6',
                  }),
                  singleValue: (provided) => ({
                    ...provided,
                    color: '#f3f4f6',
                  }),
                }}
              />
            </div>
          </div>
          <button className="mt-4 bg-yellow-400 text-gray-900 font-bold rounded-xl px-6 py-2 shadow-lg hover:bg-yellow-300 transition-all text-lg tracking-wide">
            Add Dungeon Run
          </button>
        </form>

        {/* Filters and Export */}
        <div className="flex flex-wrap gap-3 justify-between items-center mb-5">
          <div className="flex gap-3 flex-wrap">
            <select
              className="rounded-lg p-2 bg-gray-900 text-gray-100 border border-gray-700 shadow-inner"
              value={filter.dungeon}
              onChange={(e) =>
                setFilter((f) => ({ ...f, dungeon: e.target.value }))
              }
            >
              <option value="">All Dungeons</option>
              {DUNGEONS.map((d) => (
                <option key={d.name} value={d.name}>{d.name}</option>
              ))}
            </select>
            <select
              className="rounded-lg p-2 bg-gray-900 text-gray-100 border border-gray-700 shadow-inner"
              value={filter.drop}
              onChange={(e) =>
                setFilter((f) => ({ ...f, drop: e.target.value }))
              }
            >
              <option value="__allruns">All Runs</option>
              <option value="__alldrops">All Drops</option>
              {DROP_OPTIONS.map((drop) => (
                <option key={drop} value={drop}>{drop}</option>
              ))}
            </select>
            <button
              className="rounded-lg px-4 py-2 bg-gray-700 text-white hover:bg-gray-600 transition-all shadow"
              onClick={() => setFilter({ dungeon: "", drop: "__allruns" })}
              type="button"
            >
              Clear Filters
            </button>
          </div>
          <div className="flex gap-2">
            <button
              className="rounded-lg px-4 py-2 bg-yellow-500 text-gray-900 font-bold hover:bg-yellow-400 transition-all shadow"
              onClick={handleExportCSV}
              type="button"
            >
              Export CSV
            </button>
            <button
              className="rounded-lg px-4 py-2 bg-blue-500 text-white font-bold hover:bg-blue-400 transition-all shadow"
              onClick={handleExportImage}
              type="button"
            >
              Export as Image
            </button>
          </div>
        </div>

        {/* Dungeon Runs Table (for image export, wrap with ref) */}
        <div ref={tableRef} className="overflow-x-auto rounded-2xl shadow-2xl border border-gray-700 bg-gradient-to-br from-gray-950/70 to-gray-900/70">
          <table className="min-w-full bg-transparent rounded-2xl overflow-hidden">
            <thead>
              <tr>
                <th className="p-4 cursor-pointer text-left font-semibold text-yellow-400" onClick={() => handleSort("character")}>
                  Character {sort.field === "character" && (sort.asc ? "▲" : "▼")}
                </th>
                <th className="p-4 cursor-pointer text-left font-semibold text-yellow-400" onClick={() => handleSort("date")}>
                  Date {sort.field === "date" && (sort.asc ? "▲" : "▼")}
                </th>
                <th className="p-4 cursor-pointer text-left font-semibold text-yellow-400" onClick={() => handleSort("dungeon")}>
                  Dungeon {sort.field === "dungeon" && (sort.asc ? "▲" : "▼")}
                </th>
                <th className="p-4 cursor-pointer text-left font-semibold text-yellow-400" onClick={() => handleSort("drops")}>
                  Drops {sort.field === "drops" && (sort.asc ? "▲" : "▼")}
                </th>
                <th className="p-4 cursor-pointer text-left font-semibold text-yellow-400" onClick={() => handleSort("cost")}>
                  Cost {sort.field === "cost" && (sort.asc ? "▲" : "▼")}
                </th>
                <th className="p-4 cursor-pointer text-left font-semibold text-yellow-400" onClick={() => handleSort("profit")}>
                  Profit {sort.field === "profit" && (sort.asc ? "▲" : "▼")}
                </th>
                <th className="p-4 text-left font-semibold text-yellow-400 hide-when-exporting">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedRuns().map((run) => (
                <tr key={run.id} className="hover:bg-gray-700 transition">
                  <td className="p-4 text-left">{run.character}</td>
                  <td className="p-4 text-left">{run.date}</td>
                  <td className="p-4 text-left">{run.dungeon}</td>
                  <td className="p-4 text-left">
                    {run.drops && run.drops.length
                      ? run.drops.join(", ")
                      : <span className="text-gray-400">None</span>}
                  </td>
                  <td className="p-4 text-left">{run.cost}</td>
                  <td className="p-4 text-left">
                    {editId === run.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          className="rounded p-1 w-24 bg-gray-600 text-white"
                          value={editProfit}
                          onChange={(e) => setEditProfit(e.target.value)}
                        />
                        <button
                          className="bg-green-500 text-white rounded px-2 py-1 text-sm"
                          onClick={() => saveEditProfit(run)}
                        >
                          Save
                        </button>
                        <button
                          className="bg-gray-400 text-gray-900 rounded px-2 py-1 text-sm"
                          onClick={cancelEditProfit}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>{run.profit !== undefined && run.profit !== "" ? run.profit : <span className="text-gray-400">—</span>}</span>
                        <button
                          className="bg-yellow-400 text-gray-900 rounded px-2 py-1 text-xs hover:bg-yellow-300"
                          onClick={() => startEditProfit(run)}
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-left hide-when-exporting">
                    <button
                      className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-400 transition"
                      onClick={() => handleDelete(run.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {sortedRuns().length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center p-4 text-gray-400">
                    No runs yet. Add your first dungeon run!
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-gray-900 font-bold">
                <td className="p-4 text-left text-yellow-400">Totals</td>
                <td className="p-4 text-left">{numRuns}</td>
                <td className="p-4 text-left"></td>
                <td className="p-4 text-left"></td>
                <td className="p-4 text-left">{totalCost}</td>
                <td className="p-4 text-left">{totalProfit}</td>
                <td className="p-4 text-left hide-when-exporting"></td>
              </tr>
            </tfoot>
          </table>
          {numRuns > 0 && (
            <div className="flex flex-col sm:flex-row gap-2 justify-end mt-2">
              <div className="bg-gray-800 rounded-xl px-5 py-2 shadow text-yellow-300 text-base font-semibold flex-1 sm:flex-none text-center">
                Total Profit/Loss:&nbsp;
                <span className={(totalProfit - totalCost) >= 0 ? "text-green-400" : "text-red-400"}>
                  {totalProfit - totalCost}
                </span>
              </div>
              <div className="bg-gray-800 rounded-xl px-5 py-2 shadow text-yellow-300 text-base font-semibold flex-1 sm:flex-none text-center">
                Profit/Loss per Run:&nbsp;
                <span className={((totalProfit - totalCost) / numRuns) >= 0 ? "text-green-400" : "text-red-400"}>
                  {((totalProfit - totalCost) / numRuns).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        {deletedRun && (
          <div className="flex justify-center mt-4">
            <button
              className="bg-green-500 text-white px-4 py-2 rounded-lg shadow hover:bg-green-400 transition"
              onClick={handleUndoDelete}
            >
              Undo Delete
            </button>
          </div>
        )}

        <div className="text-xs text-gray-500 text-center mt-8 select-none tracking-wide">
          IdleMMO Dungeon Tracker &bull; Made with React & Tailwind CSS
        </div>
      </div>
    </div>
  );
}

export default App;
