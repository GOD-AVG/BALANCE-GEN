document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('btn');
    const tryAgainBtn = document.getElementById('tryAgainBtn');
    const resultContainer = document.getElementById('dietResult');

    if (generateBtn) {
        generateBtn.addEventListener('click', generateDiet);
    }

    if (tryAgainBtn) {
        tryAgainBtn.addEventListener('click', () => {
            document.getElementById('items').value = '';
            resultContainer.classList.add('hidden');
            window.scrollTo({
                top: document.querySelector('.input-section').offsetTop - 100,
                behavior: 'smooth'
            });
        });
    }
});

async function generateDiet() {
    // Show loading state
    const generateBtn = document.getElementById('btn');
    const originalBtnText = generateBtn.innerHTML;
    generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    generateBtn.disabled = true;

    const input = document.getElementById('items')?.value.toLowerCase() || "";
    const ingredients = input.split(/[\s,]+/).map(item => item.trim()).filter(Boolean);

    if (ingredients.length === 0) {
        showError("Please enter at least one ingredient");
        generateBtn.innerHTML = originalBtnText;
        generateBtn.disabled = false;
        return;
    }

    const chart = {
        protein: null,
        carbohydrate: null,
        vegetables: [],
    };

    // Process each ingredient
    for (let item of ingredients) {
        try {
            // Skip if we've already found all categories
            if (chart.protein && chart.carbohydrate && chart.vegetables.length >= 2) break;

            const searchRes = await fetch(`https://api.spoonacular.com/food/ingredients/search?query=${item}&apiKey=c83b943ed93944d598add82c8f345821`);
            const searchData = await searchRes.json();
            
            if (!searchData.results || searchData.results.length === 0) {
                console.log(`No results found for "${item}"`);
                continue;
            }

            const id = searchData.results[0].id;
            const infoRes = await fetch(`https://api.spoonacular.com/food/ingredients/${id}/information?amount=1&unit=serving&apiKey=c83b943ed93944d598add82c8f345821`);
            const info = await infoRes.json();

            const nutrients = info.nutrition?.nutrients || [];
            let proteins = getNutrient(nutrients, 'protein');
            let carbs = getNutrient(nutrients, 'carbohydrate');

            // If no nutrients found, try the guess nutrition API
            if (proteins === 0 && carbs === 0) {
                const guessRes = await fetch(`https://api.spoonacular.com/recipes/guessNutrition?title=${item}&apiKey=c83b943ed93944d598add82c8f345821`);
                const guess = await guessRes.json();
                proteins = guess.protein?.value || 0;
                carbs = guess.carbs?.value || 0;
            }

            const categoryList = (info.categoryPath || []).map(cat => cat.toLowerCase());
            const isVegetable = categoryList.some(cat =>
                cat.includes("vegetable") || cat.includes("leafy greens") || cat.includes("salad")
            );

            // Assign to chart based on nutritional content
            if (!chart.protein && proteins >= 5) {
                chart.protein = capitalizeFirstLetter(item);
            } else if (!chart.carbohydrate && carbs >= 10) {
                chart.carbohydrate = capitalizeFirstLetter(item);
            } else if (chart.vegetables.length < 2 && isVegetable) {
                chart.vegetables.push(capitalizeFirstLetter(item));
            }

        } catch (err) {
            console.error(`Error processing "${item}":`, err);
        }
    }

    // Display results
    displayResults(chart);
    
    // Reset button
    generateBtn.innerHTML = originalBtnText;
    generateBtn.disabled = false;
}

function displayResults(chart) {
    const resultContainer = document.getElementById('dietResult');
    const proteinResult = document.getElementById('protein-result');
    const carbResult = document.getElementById('carb-result');
    const veggieResult = document.getElementById('veggie-result');
    const mealSuggestion = document.getElementById('meal-suggestion');

    // Update the DOM with results
    proteinResult.textContent = chart.protein || "Not identified (try adding protein sources like meat, fish, tofu)";
    carbResult.textContent = chart.carbohydrate || "Not identified (try adding carbs like rice, pasta, potatoes)";
    veggieResult.textContent = chart.vegetables.length ? chart.vegetables.join(', ') : "Not identified (try adding vegetables)";

    // Generate meal suggestion
    let suggestion = "";
    if (chart.protein && chart.carbohydrate && chart.vegetables.length > 0) {
        suggestion = `Try making a delicious meal with ${chart.protein}, ${chart.carbohydrate}, and ${chart.vegetables.join(' and ')}. `;
        suggestion += `For example: Grilled ${chart.protein} with roasted ${chart.vegetables[0]} and ${chart.carbohydrate}.`;
    } else {
        suggestion = "For a balanced meal, try to include a protein source, a carbohydrate, and at least one vegetable.";
        if (!chart.protein) suggestion += " Consider adding more protein sources.";
        if (!chart.carbohydrate) suggestion += " Add some carbohydrates for energy.";
        if (chart.vegetables.length === 0) suggestion += " Include vegetables for essential nutrients.";
    }
    
    mealSuggestion.textContent = suggestion;
    
    // Show results with animation
    resultContainer.classList.remove('hidden');
    window.scrollTo({
        top: resultContainer.offsetTop - 100,
        behavior: 'smooth'
    });
}

function showError(message) {
    const resultContainer = document.getElementById('dietResult');
    if (!resultContainer) return;

    resultContainer.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>${message}</h3>
            <p>Please try again with different ingredients.</p>
        </div>
    `;
    resultContainer.classList.remove('hidden');
}

function getNutrient(nutrients, keyword) {
    const match = nutrients.find(n =>
        n.name.toLowerCase().includes(keyword.toLowerCase())
    );
    return match ? match.amount : 0;
}

function capitalizeFirstLetter(string) {
    return string.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}