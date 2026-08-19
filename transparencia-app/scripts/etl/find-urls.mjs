(async () => {
    try {
        const res = await fetch('https://www.cplt.cl/transparencia_activa/datoabierto/archivos/');
        const text = await res.text();
        console.log(text.substring(0, 1000));
        
        // Extract all .csv links
        const matches = text.match(/href="([^"]+\.csv)"/gi);
        if (matches) {
            console.log("CSV files:", matches.filter(m => m.includes("Personal")));
        }
    } catch(e) {
        console.error(e);
    }
})();
