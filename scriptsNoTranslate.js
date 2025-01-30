async function generateMultiPagePDF(elementIds = ['content1'], outputFileName = "document.pdf") {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < elementIds.length; i++) {
        const element = document.getElementById(elementIds[i]);
        if (!element) {
            console.warn(`Element with ID "${elementIds[i]}" not found.`);
            continue;
        }

        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: true
        });

        const imgData = canvas.toDataURL("image/png");
        const imgWidth = pdf.internal.pageSize.getWidth();
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (i > 0) {
            pdf.addPage();
        }

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

        // if cotent exceeds the page height, add more pages
        let heightLeft = imgHeight;
        let position = -pageHeight;
        while (heightLeft > pageHeight) {
            position = position - pageHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }
    }

    pdf.save(outputFileName);
}



async function fetchLocalFile(filename) {
    try {
        const data = await fs.readFile(filename);
        return data;
    } catch (error) {
        console.error(`Failed to read ${filename}:`, error);
        return null;
    }
}


function calculateAnchorData(height, length, verticalSpacing) {
    const horizontalSpacing = length;
    const anchorsHeight = Math.ceil(height / verticalSpacing);
    const anchorsLength = Math.ceil(length / horizontalSpacing);
    const totalAnchors = anchorsHeight * anchorsLength;

    return { anchorsHeight, anchorsLength, totalAnchors };
}

function calculateLoads() {
    try {
        const height = parseFloat(document.getElementById('height').value);
        const width = parseFloat(document.getElementById('width').value);
        const length = parseFloat(document.getElementById('length').value);
        const loadClass = parseFloat(document.getElementById('load-class').value);
        const verticalSpacing = parseFloat(document.getElementById('anchor-vertical').value);
        const numSpiror = parseInt(document.getElementById('num-spiror').value);
        const underpallningBredd = parseFloat(document.getElementById('underpallning-bredd').value);
        const underpallningLängd = parseFloat(document.getElementById('underpallning-längd').value);
        const soilBearing = parseFloat(document.getElementById('soil-bearing').value);
        const consoleWidth = parseFloat(document.getElementById('console-width').value);

        // Kontrollera indata
        if (isNaN(height) || height <= 0) throw new Error("Ogiltig höjd");
        if (isNaN(width) || width <= 0) throw new Error("Ogiltig bredd");
        if (isNaN(length) || length <= 0) throw new Error("Ogiltig facklängd");
        if (isNaN(numSpiror) || numSpiror <= 0) throw new Error("Ogiltigt antal spiror");
        if (isNaN(underpallningBredd) || underpallningBredd <= 0) throw new Error("Ogiltig bredd för underpallning");
        if (isNaN(underpallningLängd) || underpallningLängd <= 0) throw new Error("Ogiltig längd för underpallning");

        const loadSafetyFactor = 1.5; // Säkerhetsfaktor för nyttolast

        // Egenvikt
        const selfWeight = (width * length * height * 0.35).toFixed(2);

        // Nyttolastberäkning
        const totalArea = (width + consoleWidth) * length;
        const correctedLoadForce = loadClass * totalArea * loadSafetyFactor;
        const totalForce = correctedLoadForce + parseFloat(selfWeight);

        // Spirlastberäkning
        const spirLoadInner = ((totalForce / numSpiror) + (consoleWidth * loadClass)).toFixed(2);
        const spirLoadOuter = ((totalForce / numSpiror) * 1.2).toFixed(2);

        // Underpallning beräkning
        const underpallningArea = underpallningBredd * underpallningLängd;
        const underpallningLoad = (totalForce / underpallningArea).toFixed(2);

        // Förankringsberäkning
        const anchorData = calculateAnchorData(height, length, verticalSpacing);

        // Uppdatera utdata
        document.getElementById('self-weight').textContent = `${selfWeight} kN`;
        document.getElementById('total-force').textContent = `${totalForce.toFixed(2)} kN`;
        document.getElementById('spir-load-inner').textContent = `${spirLoadInner} kN`;
        document.getElementById('spir-load-outer').textContent = `${spirLoadOuter} kN`;
        document.getElementById('total-anchors').textContent = `${anchorData.totalAnchors} st`;
        document.getElementById('soil-bearing-result').textContent = `${soilBearing} kN/m²`;
        document.getElementById('underpallning-load').textContent = `${underpallningLoad} kN/m²`;
    } catch (error) {
        alert(`Fel: ${error.message}`);
    }
}

function fetchDataFromScaffold() {
    // Simulerar hämtning från ställningsdimensionering
    document.getElementById('anchor-height').value = "2.0"; // Exempelvärde
    document.getElementById('bay-length').value = "2.57"; // Exempelvärde
    alert('Värden från ställningsdimensionering har hämtats.');
}

function calculateWindLoads() {
    try {
        const windSpeed = parseFloat(document.getElementById('ref-wind-speed-dropdown').value);
        const terrainCategory = parseFloat(document.getElementById('terrain-category').value);
        const formFactor = parseFloat(document.getElementById('form-factor').value);
        const locationFactor = parseFloat(document.getElementById('location-factor').value);
        const reductionFactor = parseFloat(document.getElementById('reduction-factor').value);
        const anchorHeight = parseFloat(document.getElementById('anchor-height').value);
        const bayLength = parseFloat(document.getElementById('bay-length').value);

        if (isNaN(windSpeed) || windSpeed <= 0) throw new Error('Ogiltig referensvindhastighet');
        if (isNaN(terrainCategory) || terrainCategory <= 0) throw new Error('Ogiltig terrängkategori');
        if (isNaN(formFactor) || formFactor <= 0) throw new Error('Ogiltig formfaktor');
        if (isNaN(locationFactor) || locationFactor <= 0) throw new Error('Ogiltig lägesfaktor');
        if (isNaN(reductionFactor) || reductionFactor <= 0) throw new Error('Ogiltig reduktionsfaktor');
        if (isNaN(anchorHeight) || anchorHeight <= 0) throw new Error('Ogiltig höjd mellan förankringar');
        if (isNaN(bayLength) || bayLength <= 0) throw new Error('Ogiltig facklängd');

        // Vindtryck
        const windPressure = (0.613 * windSpeed ** 2) / 1000; // Omvandlat till kN/m²

        // Projekterad area för en förankring
        const projectedArea = anchorHeight * bayLength;

        // Vindlast per förankring
        const windLoadPerAnchor = windPressure * terrainCategory * formFactor * locationFactor * reductionFactor * projectedArea * 1.5; // Säkerhetsfaktor 1.5

        // Rekommenderad provdragningslast
        const testForce = windLoadPerAnchor * 2.0; // Säkerhetsfaktor 2.0

        // Uppdatera resultat
        document.getElementById('wind-pressure').textContent = windPressure.toFixed(2);
        document.getElementById('projected-area').textContent = projectedArea.toFixed(2);
        document.getElementById('wind-load-anchor').textContent = windLoadPerAnchor.toFixed(2);
        document.getElementById('test-force').textContent = testForce.toFixed(2);

    } catch (error) {
        alert(`Fel: ${error.message}`);
    }
}

function toggleWeatherMaterial()
{
    const weatherProtection = document.getElementById('weather-protection').value;
    const materialRow = document.getElementById('weather-material-row');

    if (weatherProtection === 'ja')
    {
        materialRow.style.display = '';
    }
    else
    {
        materialRow.style.display = 'none';
    }
}