// Erzwingt Europe/Berlin als Standard-Zeitzone für alle toLocale*String-Aufrufe.
// Dadurch werden Protokoll-Zeiten und alle anderen Datumsanzeigen überall in
// deutscher Zeit dargestellt – unabhängig vom Standort des Nutzers.

const BERLIN_TZ = "Europe/Berlin";

function withBerlin(options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormatOptions {
  const opts: Intl.DateTimeFormatOptions = options ? { ...options } : {};
  if (!opts.timeZone) opts.timeZone = BERLIN_TZ;
  return opts;
}

const proto = Date.prototype as any;

if (!proto.__berlinTzPatched) {
  const origDate = proto.toLocaleDateString;
  const origTime = proto.toLocaleTimeString;
  const origBoth = proto.toLocaleString;

  proto.toLocaleDateString = function (
    this: Date,
    locales?: Intl.LocalesArgument,
    options?: Intl.DateTimeFormatOptions
  ) {
    return origDate.call(this, locales, withBerlin(options));
  };

  proto.toLocaleTimeString = function (
    this: Date,
    locales?: Intl.LocalesArgument,
    options?: Intl.DateTimeFormatOptions
  ) {
    return origTime.call(this, locales, withBerlin(options));
  };

  proto.toLocaleString = function (
    this: Date,
    locales?: Intl.LocalesArgument,
    options?: Intl.DateTimeFormatOptions
  ) {
    return origBoth.call(this, locales, withBerlin(options));
  };

  proto.__berlinTzPatched = true;
}

export {};
