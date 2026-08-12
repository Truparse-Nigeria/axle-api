import { Schema, model, type Document, type Model } from "mongoose";
import { CardBrandEnum, DiscosEnum, type ISettings } from "../common";

export interface ISettingsDocument extends ISettings, Document {}

const SettingsSchema = new Schema<ISettingsDocument>(
  {
    airtime: {
      enabled: { type: Boolean, default: true },
      networks: {
        mtn: {
          name: { type: String, default: "MTN" },
          enabled: { type: Boolean, default: true },
          providers: {
            vtpass: {
              enabled: { type: Boolean, default: true },
              rate: { type: Number, default: 1.5 },
              slug: { type: String, default: "mtn" },
            },
            ringo: {
              enabled: { type: Boolean, default: false },
              rate: { type: Number, default: 1.6 },
              slug: { type: String, default: "MFIN-5-OR" },
            },
          },
        },
        airtel: {
          name: { type: String, default: "Airtel" },
          enabled: { type: Boolean, default: true },
          providers: {
            vtpass: {
              enabled: { type: Boolean, default: true },
              rate: { type: Number, default: 1.5 },
              slug: { type: String, default: "airtel" },
            },
            ringo: {
              enabled: { type: Boolean, default: false },
              rate: { type: Number, default: 1.6 },
              slug: { type: String, default: "MFIN-1-OR" },
            },
          },
        },
        glo: {
          name: { type: String, default: "GLO" },
          enabled: { type: Boolean, default: true },
          providers: {
            vtpass: {
              enabled: { type: Boolean, default: true },
              rate: { type: Number, default: 1.5 },
              slug: { type: String, default: "glo" },
            },
            ringo: {
              enabled: { type: Boolean, default: false },
              rate: { type: Number, default: 1.6 },
              slug: { type: String, default: "MFIN-6-OR" },
            },
          },
        },
        "9mobile": {
          name: { type: String, default: "9Mobile" },
          enabled: { type: Boolean, default: false },
          providers: {
            vtpass: {
              enabled: { type: Boolean, default: true },
              rate: { type: Number, default: 1.5 },
              slug: { type: String, default: "9mobile" },
            },
            ringo: {
              enabled: { type: Boolean, default: false },
              rate: { type: Number, default: 1.6 },
              slug: { type: String, default: "MFIN-2-OR" },
            },
          },
        },
      },
    },
    cheapData: {
      enabled: { type: Boolean, default: true },
      networks: {
        mtn: {
          name: { type: String, default: "MTN" },
          enabled: { type: Boolean, default: true },
        },
        airtel: {
          name: { type: String, default: "Airtel" },
          enabled: { type: Boolean, default: true },
        },
        glo: {
          name: { type: String, default: "GLO" },
          enabled: { type: Boolean, default: true },
        },
        "9mobile": {
          name: { type: String, default: "9Mobile" },
          enabled: { type: Boolean, default: true },
        },
      },
    },
    electricity: {
      enabled: { type: Boolean, default: true },
      charge: { type: Number, default: 100 },
      discos: {
        ikeja: {
          enabled: { type: Boolean, default: true },
          name: { type: String, default: DiscosEnum.IKEDC },
          code: { type: String, default: "IKEDC" },
          providers: {
            vtpass: {
              enabled: { type: Boolean, default: true },
              rate: { type: Number, default: 1.5 },
              slug: { type: String, default: "ikeja-electric" },
            },
          },
        },
        eko: {
          enabled: { type: Boolean, default: true },
          name: { type: String, default: DiscosEnum.EKEDC },
          code: { type: String, default: "EKEDC" },
          providers: {
            vtpass: {
              enabled: { type: Boolean, default: true },
              rate: { type: Number, default: 1.5 },
              slug: { type: String, default: "eko-electric" },
            },
          },
        },
        kano: {
          enabled: { type: Boolean, default: true },
          name: { type: String, default: DiscosEnum.KEDCO },
          code: { type: String, default: "KEDCO" },
          providers: {
            vtpass: {
              enabled: { type: Boolean, default: true },
              rate: { type: Number, default: 1.5 },
              slug: { type: String, default: "kano-electric" },
            },
          },
        },
        portharcourt: {
          enabled: { type: Boolean, default: true },
          name: { type: String, default: DiscosEnum.PHED },
          code: { type: String, default: "PHED" },
          providers: {
            vtpass: {
              enabled: { type: Boolean, default: true },
              rate: { type: Number, default: 1.5 },
              slug: { type: String, default: "portharcourt-electric" },
            },
          },
        },
        jos: {
          enabled: { type: Boolean, default: true },
          name: { type: String, default: DiscosEnum.JED },
          code: { type: String, default: "JED" },
          providers: {
            vtpass: {
              enabled: { type: Boolean, default: true },
              rate: { type: Number, default: 1.5 },
              slug: { type: String, default: "jos-electric" },
            },
          },
        },
        ibadan: {
          enabled: { type: Boolean, default: true },
          name: { type: String, default: DiscosEnum.IBEDC },
          code: { type: String, default: "IBEDC" },
          providers: {
            vtpass: {
              enabled: { type: Boolean, default: true },
              rate: { type: Number, default: 1.5 },
              slug: { type: String, default: "ibadan-electric" },
            },
          },
        },
        kaduna: {
          enabled: { type: Boolean, default: true },
          name: { type: String, default: DiscosEnum.KAEDCO },
          code: { type: String, default: "KAEDC" },
          providers: {
            vtpass: {
              enabled: { type: Boolean, default: true },
              rate: { type: Number, default: 1.5 },
              slug: { type: String, default: "kaduna-electric" },
            },
          },
        },
        abuja: {
          enabled: { type: Boolean, default: true },
          name: { type: String, default: DiscosEnum.AEDC },
          code: { type: String, default: "AEDC" },
          providers: {
            vtpass: {
              enabled: { type: Boolean, default: true },
              rate: { type: Number, default: 1.5 },
              slug: { type: String, default: "abuja-electric" },
            },
          },
        },
        enugu: {
          enabled: { type: Boolean, default: true },
          name: { type: String, default: DiscosEnum.EEDC },
          code: { type: String, default: "EEDC" },
          providers: {
            vtpass: {
              enabled: { type: Boolean, default: true },
              rate: { type: Number, default: 1.5 },
              slug: { type: String, default: "enugu-electric" },
            },
          },
        },
        benin: {
          enabled: { type: Boolean, default: true },
          name: { type: String, default: DiscosEnum.BEDC },
          code: { type: String, default: "BEDC" },
          providers: {
            vtpass: {
              enabled: { type: Boolean, default: true },
              rate: { type: Number, default: 1.5 },
              slug: { type: String, default: "benin-electric" },
            },
          },
        },
        aba: {
          enabled: { type: Boolean, default: true },
          name: { type: String, default: DiscosEnum.ABA },
          code: { type: String, default: "ABA" },
          providers: {
            vtpass: {
              enabled: { type: Boolean, default: true },
              rate: { type: Number, default: 1.5 },
              slug: { type: String, default: "aba-electric" },
            },
          },
        },
        yola: {
          enabled: { type: Boolean, default: true },
          name: { type: String, default: DiscosEnum.YEDC },
          code: { type: String, default: "YEDC" },
          providers: {
            vtpass: {
              enabled: { type: Boolean, default: true },
              rate: { type: Number, default: 1.5 },
              slug: { type: String, default: "yola-electric" },
            },
          },
        },
      },
    },
    cable: {
      enabled: { type: Boolean, default: true },
      charge: { type: Number, default: 100 },
      networks: {
        dstv: {
          name: { type: String, default: "DSTV" },
          enabled: { type: Boolean, default: true },
          providers: {
            vtpass: {
              enabled: { type: Boolean, default: true },
              rate: { type: Number, default: 1.5 },
              slug: { type: String, default: "dstv" },
            },
          },
        },
        gotv: {
          name: { type: String, default: "GOTV" },
          enabled: { type: Boolean, default: true },
          providers: {
            vtpass: {
              enabled: { type: Boolean, default: true },
              rate: { type: Number, default: 1.5 },
              slug: { type: String, default: "gotv" },
            },
          },
        },
        startimes: {
          name: { type: String, default: "Startimes" },
          enabled: { type: Boolean, default: true },
          providers: {
            vtpass: {
              enabled: { type: Boolean, default: true },
              rate: { type: Number, default: 1.5 },
              slug: { type: String, default: "startimes" },
            },
          },
        },
        showmax: {
          name: { type: String, default: "Showmax" },
          enabled: { type: Boolean, default: true },
          providers: {
            vtpass: {
              enabled: { type: Boolean, default: true },
              rate: { type: Number, default: 1.5 },
              slug: { type: String, default: "showmax" },
            },
          },
        },
      },
    },
    regularData: {
      enabled: { type: Boolean, default: true },
      networks: {
        mtn: {
          name: { type: String, default: "MTN" },
          enabled: { type: Boolean, default: true },
          providers: {
            vtpass: {
              enabled: { type: Boolean, default: true },
              rate: { type: Number, default: 1.5 },
              slug: { type: String, default: "mtn-data" },
            },
            ringo: {
              enabled: { type: Boolean, default: false },
              rate: { type: Number, default: 1.5 },
              slug: { type: String, default: "mtn" },
            },
          },
        },
        airtel: {
          name: { type: String, default: "Airtel" },
          enabled: { type: Boolean, default: true },
          providers: {
            vtpass: {
              enabled: { type: Boolean, default: false },
              rate: { type: Number, default: 1.5 },
              slug: { type: String, default: "airtel-data" },
            },
            ringo: {
              enabled: { type: Boolean, default: true },
              rate: { type: Number, default: 1.5 },
              slug: { type: String, default: "airtel" },
            },
          },
        },
        glo: {
          name: { type: String, default: "GLO" },
          enabled: { type: Boolean, default: true },
          providers: {
            vtpass: {
              enabled: { type: Boolean, default: false },
              rate: { type: Number, default: 1.5 },
              slug: { type: String, default: "glo-data" },
            },
            ringo: {
              enabled: { type: Boolean, default: true },
              rate: { type: Number, default: 1.5 },
              slug: { type: String, default: "glo" },
            },
          },
        },
        "9mobile": {
          name: { type: String, default: "9Mobile" },
          enabled: { type: Boolean, default: true },
          providers: {
            vtpass: {
              enabled: { type: Boolean, default: false },
              rate: { type: Number, default: 1.5 },
              slug: { type: String, default: "etisalat-data" },
            },
            ringo: {
              enabled: { type: Boolean, default: true },
              rate: { type: Number, default: 1.5 },
              slug: { type: String, default: "9mobile" },
            },
          },
        },
      },
    },
    giftcard: {
      enabled: { type: Boolean, default: true },
      charge: { type: Number, default: 0 },
      providers: {
        reloadly: {
          enabled: { type: Boolean, default: true },
          rate: { type: Number, default: 0 }, // This will be in USD
          rateMarkup: { type: Number, default: 100 },
          slug: { type: String, default: "reloadly" },
        },
      },
    },
    cards: {
      ascend: {
        active: { type: Boolean, default: true },
        instruction: {
          type: String,
          default:
            "No Maintenance or Decline fees, Instant Withdrawals, faster than Origin",
        },
        customRates: {
          withdrawal: { type: Number, default: 120 },
          funding: { type: Number, default: 70 },
          base: { type: Number, default: 1623 },
        },
        currency: {
          usd: {
            maxCardCreation: { type: Number, default: 3 },
            brandConfig: {
              mastercard: {
                name: { type: String, default: CardBrandEnum.MASTERCARD },
                create: { type: Boolean, default: true },
                fund: { type: Boolean, default: true },
                withdraw: { type: Boolean, default: true },
                minCardBalance: { type: Number, default: 1 },
                minFundingOnCreation: { type: Number, default: 1 },
                providerCreationFee: { type: Number, default: 1 },
                maxDepositPerTime: { type: Number, default: 2500 },
                monthlyTransactionLimit: { type: Number, default: 100000 },
                minFund: { type: Number, default: 2 },
                currency: { type: String, default: "USD" },
                creationFee: { type: Number, default: 2 },
                fundingCharge: {
                  providerPercent: { type: Number, default: 1.5 },
                  percent: { type: Number, default: 2 },
                  fixed: { type: Number, default: 1 },
                },
              },
              visa: {
                name: { type: String, default: CardBrandEnum.VISA },
                create: { type: Boolean, default: true },
                fund: { type: Boolean, default: true },
                withdraw: { type: Boolean, default: true },
                minCardBalance: { type: Number, default: 1 },
                minFundingOnCreation: { type: Number, default: 1 },
                providerCreationFee: { type: Number, default: 1 },
                maxDepositPerTime: { type: Number, default: 2500 },
                monthlyTransactionLimit: { type: Number, default: 100000 },
                minFund: { type: Number, default: 2 },
                currency: { type: String, default: "USD" },
                creationFee: { type: Number, default: 2 },
                fundingCharge: {
                  providerPercent: { type: Number, default: 1.5 },
                  percent: { type: Number, default: 2 },
                  fixed: { type: Number, default: 1 },
                },
              },
            },
          },
        },
      },
      origin: {
        active: { type: Boolean, default: false },
        instruction: {
          type: String,
          default: "Has Maintenance ans Decline fees, Timed Withdrawals",
        },
        customRates: {
          withdrawal: { type: Number, default: 120 },
          funding: { type: Number, default: 70 },
          base: { type: Number, default: 1623 },
        },
        currency: {
          usd: {
            maxCardCreation: { type: Number, default: 5 },
            brandConfig: {
              mastercard: {
                name: { type: String, default: CardBrandEnum.MASTERCARD },
                create: { type: Boolean, default: false },
                fund: { type: Boolean, default: true },
                withdraw: { type: Boolean, default: true },
                minCardBalance: { type: Number, default: 1 },
                minFundingOnCreation: { type: Number, default: 1 },
                providerCreationFee: { type: Number, default: 1 },
                maxDepositPerTime: { type: Number, default: 2500 },
                monthlyTransactionLimit: { type: Number, default: 100000 },
                minFund: { type: Number, default: 2 },
                currency: { type: String, default: "USD" },
                creationFee: { type: Number, default: 2 },
                fundingCharge: {
                  providerPercent: { type: Number, default: 1.5 },
                  percent: { type: Number, default: 2 },
                  fixed: { type: Number, default: 1 },
                },
              },
              visa: {
                name: { type: String, default: CardBrandEnum.VISA },
                create: { type: Boolean, default: false },
                fund: { type: Boolean, default: true },
                withdraw: { type: Boolean, default: true },
                minCardBalance: { type: Number, default: 1 },
                minFundingOnCreation: { type: Number, default: 1 },
                providerCreationFee: { type: Number, default: 1 },
                maxDepositPerTime: { type: Number, default: 2500 },
                monthlyTransactionLimit: { type: Number, default: 100000 },
                minFund: { type: Number, default: 2 },
                currency: { type: String, default: "USD" },
                creationFee: { type: Number, default: 2 },
                fundingCharge: {
                  providerPercent: { type: Number, default: 1.5 },
                  percent: { type: Number, default: 2 },
                  fixed: { type: Number, default: 1 },
                },
              },
            },
          },
        },
      },
    },
    airtimeToCash: {
      enabled: { type: Boolean, default: true },
      min: { type: Number, default: 50 },
      max: { type: Number, default: 5000 },
      perDay: { type: Number, default: 200000 },
      networks: {
        mtn: {
          name: { type: String, default: "MTN" },
          enabled: { type: Boolean, default: true },
          providers: {
            airfund: {
              rate: { type: Number, default: 10 },
              enabled: { type: Boolean, default: true },
              slug: { type: String, default: "1" },
              charge: { type: Number, default: 15 },
            },
            blaac: {
              rate: { type: Number, default: 15 },
              enabled: { type: Boolean, default: true },
              slug: { type: String, default: "mtn" },
              charge: { type: Number, default: 10 },
            },
          },
        },
        airtel: {
          name: { type: String, default: "Airtel" },
          enabled: { type: Boolean, default: false },
          providers: {
            airfund: {
              rate: { type: Number, default: 5 },
              enabled: { type: Boolean, default: true },
              slug: { type: String, default: "3" },
              charge: { type: Number, default: 20 },
            },
            blaac: {
              rate: { type: Number, default: 15 },
              enabled: { type: Boolean, default: true },
              slug: { type: String, default: "airtel" },
              charge: { type: Number, default: 10 },
            },
          },
        },
        glo: {
          name: { type: String, default: "Glo" },
          enabled: { type: Boolean, default: false },
          providers: {
            airfund: {
              rate: { type: Number, default: 5 },
              enabled: { type: Boolean, default: true },
              slug: { type: String, default: "4" },
              charge: { type: Number, default: 10 },
            },
            blaac: {
              rate: { type: Number, default: 15 },
              enabled: { type: Boolean, default: true },
              slug: { type: String, default: "glo" },
              charge: { type: Number, default: 10 },
            },
          },
        },
        "9mobile": {
          name: { type: String, default: "9Mobile" },
          enabled: { type: Boolean, default: false },
          providers: {
            airfund: {
              rate: { type: Number, default: 5 },
              enabled: { type: Boolean, default: true },
              slug: { type: String, default: "2" },
              charge: { type: Number, default: 10 },
            },
            blaac: {
              rate: { type: Number, default: 15 },
              enabled: { type: Boolean, default: true },
              slug: { type: String, default: "9mobile" },
              charge: { type: Number, default: 10 },
            },
          },
        },
      },
    },
    crypto: {
      enabled: { type: Boolean, default: true },
      options: {
        usdt: {
          name: { type: String, default: "USDT" },
          deposit: { type: Boolean, default: true },
          withdraw: { type: Boolean, default: true },
          swap: { type: Boolean, default: true },
          enabled: { type: Boolean, default: true },
          providers: {
            quidax: {
              enabled: { type: Boolean, default: true },
              rate: { type: Number, default: 2.5 },
              withdrawalFee: { type: Number, default: 1.5 },
              slug: { type: String, default: "quidax" },
            },
          },
        },
        usdc: {
          name: { type: String, default: "USDC" },
          enabled: { type: Boolean, default: true },
          deposit: { type: Boolean, default: true },
          withdraw: { type: Boolean, default: true },
          swap: { type: Boolean, default: true },
          providers: {
            quidax: {
              enabled: { type: Boolean, default: true },
              rate: { type: Number, default: 2.5 },
              withdrawalFee: { type: Number, default: 1.5 },
              slug: { type: String, default: "quidax" },
            },
          },
        },
        btc: {
          name: { type: String, default: "BTC" },
          deposit: { type: Boolean, default: true },
          withdraw: { type: Boolean, default: true },
          swap: { type: Boolean, default: true },
          enabled: { type: Boolean, default: true },
          providers: {
            quidax: {
              enabled: { type: Boolean, default: true },
              rate: { type: Number, default: 2.5 },
              withdrawalFee: { type: Number, default: 1.5 },
              slug: { type: String, default: "quidax" },
            },
          },
        },
        eth: {
          name: { type: String, default: "ETH" },
          deposit: { type: Boolean, default: true },
          withdraw: { type: Boolean, default: true },
          swap: { type: Boolean, default: true },
          enabled: { type: Boolean, default: true },
          providers: {
            quidax: {
              enabled: { type: Boolean, default: true },
              rate: { type: Number, default: 2.5 },
              withdrawalFee: { type: Number, default: 1.5 },
              slug: { type: String, default: "quidax" },
            },
          },
        },
      },
    },
  },
  {
    timestamps: true,
  },
);

export const Settings: Model<ISettingsDocument> = model<ISettingsDocument>(
  "Settings",
  SettingsSchema,
);
