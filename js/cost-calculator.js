/**
 * DriverLine Cost Calculator
 * Calculates estimated monthly in-house delivery costs
 */

(function () {
  'use strict';

  const WEEKS_PER_MONTH = 4.348;

  // DOM Elements
  const form = document.getElementById('cost-calculator-form');
  const requestCoverageBtn = document.getElementById('request-coverage-btn');

  // Result elements
  const resultWages = document.getElementById('result-wages');
  const resultBurden = document.getElementById('result-burden');
  const resultFuel = document.getElementById('result-fuel');
  const resultVehicleFixed = document.getElementById('result-vehicle-fixed');
  const resultAdmin = document.getElementById('result-admin');
  const resultDailyTotal = document.getElementById('result-daily-total');
  const resultTotal = document.getElementById('result-total');

  if (!form) return;

  /**
   * Get numeric value from input
   */
  function getInputValue(id) {
    const input = document.getElementById(id);
    return input ? parseFloat(input.value) || 0 : 0;
  }

  /**
   * Format number as currency
   */
  function formatCurrency(amount) {
    return '$' + amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }

  /**
   * Calculate all costs and update display
   */
  function calculateCosts() {
    // Get input values
    const drivers = getInputValue('drivers');
    const hourlyWage = getInputValue('hourlyWage');
    const hoursPerDay = getInputValue('hoursPerDay');
    const daysPerWeek = getInputValue('daysPerWeek');
    const overtimeHours = getInputValue('overtimeHours');
    const employerBurden = getInputValue('employerBurden') / 100;

    const vehicles = getInputValue('vehicles');
    const milesPerDay = getInputValue('milesPerDay');
    const mpg = getInputValue('mpg');
    const gasPrice = getInputValue('gasPrice');
    const insurancePerVehicle = getInputValue('insurancePerVehicle');
    const maintenancePerVehicle = getInputValue('maintenancePerVehicle');
    const depreciationPerVehicle = getInputValue('depreciationPerVehicle');

    const adminHoursPerWeek = getInputValue('adminHoursPerWeek');
    const adminHourlyRate = getInputValue('adminHourlyRate');

    // Calculate monthly wages
    const regularHoursPerWeek = hoursPerDay * daysPerWeek;
    const regularWeeklyWage = regularHoursPerWeek * hourlyWage;
    const overtimeWeeklyWage = overtimeHours * hourlyWage * 1.5;
    const totalWeeklyWage = regularWeeklyWage + overtimeWeeklyWage;
    const monthlyWages = totalWeeklyWage * WEEKS_PER_MONTH * drivers;

    // Calculate employer burden
    const monthlyBurden = monthlyWages * employerBurden;

    // Calculate fuel cost
    const dailyMilesAllVehicles = milesPerDay * vehicles;
    const dailyGallons = mpg > 0 ? dailyMilesAllVehicles / mpg : 0;
    const dailyFuelCost = dailyGallons * gasPrice;
    const monthlyFuelCost = dailyFuelCost * daysPerWeek * WEEKS_PER_MONTH;

    // Calculate vehicle fixed costs
    const monthlyVehicleFixed = (insurancePerVehicle + maintenancePerVehicle + depreciationPerVehicle) * vehicles;

    // Calculate admin cost
    const monthlyAdminCost = adminHoursPerWeek * adminHourlyRate * WEEKS_PER_MONTH;

    // Calculate total
    const totalMonthlyCost = monthlyWages + monthlyBurden + monthlyFuelCost + monthlyVehicleFixed + monthlyAdminCost;

    // Calculate daily total (21 working days per month)
    const totalDailyCost = Math.round(totalMonthlyCost / 21);

    // Update display
    if (resultWages) resultWages.textContent = formatCurrency(monthlyWages);
    if (resultBurden) resultBurden.textContent = formatCurrency(monthlyBurden);
    if (resultFuel) resultFuel.textContent = formatCurrency(monthlyFuelCost);
    if (resultVehicleFixed) resultVehicleFixed.textContent = formatCurrency(monthlyVehicleFixed);
    if (resultAdmin) resultAdmin.textContent = formatCurrency(monthlyAdminCost);
    if (resultDailyTotal) resultDailyTotal.textContent = formatCurrency(totalDailyCost);
    if (resultTotal) resultTotal.textContent = formatCurrency(totalMonthlyCost);

    // Update CTA button link with query params
    if (requestCoverageBtn) {
      const params = new URLSearchParams({
        monthly_total: Math.round(totalMonthlyCost),
        drivers: Math.round(drivers),
        vehicles: Math.round(vehicles)
      });
      requestCoverageBtn.href = 'contact.html#request-coverage?' + params.toString();
    }

    // Analytics event
    if (window.dataLayer) {
      window.dataLayer.push({
        event: 'calculator_update',
        calculator_total: Math.round(totalMonthlyCost),
        calculator_drivers: Math.round(drivers),
        calculator_vehicles: Math.round(vehicles)
      });
    }
  }

  /**
   * Sync vehicles with drivers by default
   */
  function syncVehiclesToDrivers() {
    const driversInput = document.getElementById('drivers');
    const vehiclesInput = document.getElementById('vehicles');

    if (driversInput && vehiclesInput) {
      // Track if user has manually changed vehicles
      let vehiclesManuallySet = false;

      vehiclesInput.addEventListener('input', function () {
        vehiclesManuallySet = true;
      });

      driversInput.addEventListener('input', function () {
        if (!vehiclesManuallySet) {
          vehiclesInput.value = driversInput.value;
        }
      });
    }
  }

  /**
   * Initialize calculator
   */
  function init() {
    // Sync vehicles to drivers initially
    syncVehiclesToDrivers();

    // Calculate on any input change
    const inputs = form.querySelectorAll('input');
    inputs.forEach(function (input) {
      input.addEventListener('input', calculateCosts);
      input.addEventListener('change', calculateCosts);
    });

    // Initial calculation
    calculateCosts();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
