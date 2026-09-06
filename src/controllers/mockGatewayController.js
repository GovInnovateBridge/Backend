const crypto = require('crypto');

// Pure helper function for internal calls (Cron & Controller)
exports.processPFMSDisbursement = (escrowId, milestoneCode, amount) => {
    const transactionRef = `PFMS-TXN-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    return {
        transactionRef,
        status: "SUCCESS",
        disbursedAt: new Date().toISOString()
    };
};

// Express Route Handler for POST /api/mock/pfms/disburse
exports.disbursePFMS = (req, res) => {
    const { escrowId, milestoneCode, amount, beneficiaryAccount } = req.body;

    if (!escrowId || !milestoneCode || !amount || !beneficiaryAccount) {
        return res.status(400).json({ message: "Missing required fields for PFMS disbursement." });
    }

    const data = exports.processPFMSDisbursement(escrowId, milestoneCode, amount);
    return res.status(200).json(data);
};

// Helper for internal use (e.g., Auth Registration)
exports.getMockDpiitData = (dpiitNumber) => {
    return {
        "api_status": "SUCCESS",
        "response_code": 200,
        "timestamp": new Date().toISOString(),
        "source": "DPIIT Startup India Database",
        "gateway": "API Setu - National Data Exchange Platform",
        "request_id": `APISETU-REQ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomInt(1000000, 9999999)}`,
        "api_version": "v2.1",
        "consumer_reference": "SAHYOG-B2G-SANDBOX",
        "data": {
            "dpiit_recognition_number": dpiitNumber,
            "recognition_status": "ACTIVE",
            "recognition_certificate_number": `DIPP/2023/CERT/0${crypto.randomInt(100000, 999999)}`,
            "date_of_recognition": "2023-06-19",
            "recognition_valid_till": "2033-06-18",
            "entity_details": {
                "legal_entity_name": "TrafficSense AI Technologies Private Limited",
                "cin": "U72900DL2023PTC412345",
                "entity_type": "Private Limited Company",
                "date_of_incorporation": "2023-04-11",
                "roc_office": "Registrar of Companies, NCT of Delhi and Haryana",
                "pan": "AACCT4521P",
                "gstin": "09AACCT4521P1ZQ",
                "company_status": "Active",
                "authorized_capital_inr": 5000000,
                "paid_up_capital_inr": 1200000
            },
            "classification": {
                "industry": "Information Technology",
                "sector": "Artificial Intelligence & Machine Learning",
                "sub_sector": "Computer Vision / Intelligent Transportation Systems",
                "dpiit_startup_category": "Technology Startup",
                "nic_code": "62013",
                "nic_description": "Computer programming, consultancy and related activities"
            },
            "registered_address": {
                "address_line_1": "T-Hub Innovation Campus",
                "address_line_2": "Plot No. 1, Software Units Layout, Sector 62",
                "city": "Noida",
                "district": "Gautam Buddh Nagar",
                "state": "Uttar Pradesh",
                "pincode": "201309",
                "country": "India"
            },
            "contact_information": {
                "official_email": "compliance@trafficsense.ai",
                "official_phone": "+91-120-4567890",
                "website": "https://www.trafficsense.ai"
            },
            "leadership": {
                "redaction_policy": {
                    "auto_redact_before_jury_review": true,
                    "redaction_engine": "Sahyog AI Redaction Pipeline v1.4",
                    "fields_to_redact": ["name", "din"]
                },
                "directors": [
                    {
                        "name": "Arjun Mehta",
                        "designation": "Founder & Managing Director",
                        "din": "09876543",
                        "din_status": "Approved",
                        "date_of_appointment": "2023-04-11"
                    },
                    {
                        "name": "Priya Nair",
                        "designation": "Co-Founder & Whole-time Director",
                        "din": "09876544",
                        "din_status": "Approved",
                        "date_of_appointment": "2023-04-11"
                    },
                    {
                        "name": "Rohan Kulkarni",
                        "designation": "Director (Technology)",
                        "din": "09876545",
                        "din_status": "Approved",
                        "date_of_appointment": "2023-09-02"
                    }
                ]
            },
            "exemption_eligibility": {
                "tax_exemption_80iac": true,
                "tax_exemption_80iac_certificate_number": "80IAC/2024/DL/008821",
                "angel_tax_exemption_56_2_viib": true,
                "public_procurement_exemption": true,
                "public_procurement_exemption_details": {
                    "emd_waiver": true,
                    "prior_turnover_criteria_waiver": true,
                    "prior_experience_criteria_waiver": true,
                    "applicable_guideline": "Public Procurement (Preference to Startups) Guidelines, DPIIT"
                },
                "self_certification_labour_environment_laws": true
            },
            "verification_meta": {
                "verified_by": "DPIIT Startup India Registry",
                "verification_method": "REAL_TIME_API_LOOKUP",
                "data_freshness": "LIVE",
                "checksum": "sha256:2b7e4f1a9c6d3e0f8b5a2c7d4e1f9b6a3c0d7e4f1b8a5c2d9e6f3b0a7c4d1e8f"
            }
        }
    };
};

// GET /api/mock/dpiit/:dpiitNumber
// Simulates fetching startup data from Startup India Registry (API Setu)
exports.fetchDPIITDetails = (req, res) => {
    const { dpiitNumber } = req.params;

    if (!dpiitNumber) {
        return res.status(400).json({ message: "DPIIT number is required." });
    }

    const mockData = exports.getMockDpiitData(dpiitNumber);

    return res.status(200).json(mockData);
};