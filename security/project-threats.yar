rule Credential_Exfiltration_JavaScript
{
  meta:
    description = "Detects combined credential access and network exfiltration primitives"
    severity = "high"
  strings:
    $cookie = "document.cookie" ascii wide
    $password = "input[type=\"password\"]" ascii wide
    $fetch = "fetch(" ascii wide
    $xhr = "XMLHttpRequest" ascii wide
    $beacon = "sendBeacon(" ascii wide
  condition:
    any of ($cookie, $password) and any of ($fetch, $xhr, $beacon)
}

rule WebExtension_History_Or_Cookie_Collection
{
  meta:
    description = "Detects browser-extension history or cookie collection permissions/APIs"
    severity = "high"
  strings:
    $history_permission = "\"history\"" ascii wide
    $cookies_permission = "\"cookies\"" ascii wide
    $chrome_history = "chrome.history." ascii wide
    $browser_history = "browser.history." ascii wide
    $chrome_cookies = "chrome.cookies." ascii wide
    $browser_cookies = "browser.cookies." ascii wide
  condition:
    any of them
}

rule Suspicious_JavaScript_Dynamic_Execution
{
  meta:
    description = "Detects clustered dynamic-code and obfuscation primitives"
    severity = "high"
  strings:
    $eval = "eval(" ascii wide
    $function = "new Function(" ascii wide
    $import = "importScripts(" ascii wide
    $atob = "atob(" ascii wide
    $unescape = "unescape(" ascii wide
  condition:
    2 of them
}

rule Shell_Download_And_Execute
{
  meta:
    description = "Detects shell downloader or dropper behavior"
    severity = "critical"
  strings:
    $curl = "curl " ascii wide
    $wget = "wget " ascii wide
    $pipe_sh = "| sh" ascii wide
    $pipe_bash = "| bash" ascii wide
    $powershell = "powershell" nocase ascii wide
    $download = "DownloadString" nocase ascii wide
  condition:
    (($curl or $wget) and ($pipe_sh or $pipe_bash)) or ($powershell and $download)
}

rule Worm_Propagation_Indicators
{
  meta:
    description = "Detects common self-propagation command clusters"
    severity = "critical"
  strings:
    $autorun = "autorun.inf" nocase ascii wide
    $shares = "net use \\\\" nocase ascii wide
    $psexec = "psexec" nocase ascii wide
    $xcopy = "xcopy " nocase ascii wide
  condition:
    2 of them
}

rule Cryptominer_Indicators
{
  meta:
    description = "Detects common browser and native cryptomining indicators"
    severity = "high"
  strings:
    $stratum = "stratum+tcp://" nocase ascii wide
    $coinhive = "coinhive" nocase ascii wide
    $xmrig = "xmrig" nocase ascii wide
    $cryptonight = "cryptonight" nocase ascii wide
  condition:
    any of them
}
