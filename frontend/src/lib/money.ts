// CL-07, VM-24: the one money helper, shared with the services. Components don't call formatMoney
// themselves: they use useMoney() (components/money/MoneyProvider), which knows the restaurant's currency.
export { DEFAULT_MONEY, formatMoney, toCents, type MoneySettings } from "@vmenu/contracts/money";
