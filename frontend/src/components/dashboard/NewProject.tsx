"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Sticker } from "../Sticker";
import {
  Globe,
  Server,
  Database,
  Rocket,
  GitBranch,
  Star,
  Heart,
  ArrowRight,
  ArrowLeft,
  Plus,
  X,
  Mail,
} from "lucide-react";
import api from "../../lib/api";

type ServiceType =
  | "static-site"
  | "email-service"
  | "web-service"
  | "private-service"
  | "background-worker"
  | "cron-job"
  | "database";

interface EnvVar {
  key: string;
  value: string;
}

export function NewProject() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [serviceType, setServiceType] = useState<ServiceType | null>(null);
  const [gitUrl, setGitUrl] = useState("");
  const [projectName, setProjectName] = useState("");
  const [branch, setBranch] = useState("main");
  const [buildCommand, setBuildCommand] = useState("");
  const [startCommand, setStartCommand] = useState("");
  const [outputDir, setOutputDir] = useState("dist");
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  
  // New States for validation and logs
  const [isNameAvailable, setIsNameAvailable] = useState<boolean | null>(null);
  const [isCheckingName, setIsCheckingName] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll logs
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  useEffect(() => {
    const checkName = async () => {
      if (!projectName.trim()) {
        setIsNameAvailable(null);
        return;
      }
      setIsCheckingName(true);
      try {
        const res = await api.get(`/project/check-name?name=${projectName}`);
        setIsNameAvailable(res.data.available);
      } catch (err) {
        console.error("Failed to check project name", err);
        setIsNameAvailable(null);
      } finally {
        setIsCheckingName(false);
      }
    };

    const debounceId = setTimeout(checkName, 500);
    return () => clearTimeout(debounceId);
  }, [projectName]);

  const services = [
    {
      type: "static-site" as ServiceType,
      icon: Globe,
      title: "Static Sites",
      description:
        "Static content served over a global CDN. Ideal for frontend, blogs, and content sites.",
      color: "primary" as const,
    },
    {
      type: "email-service" as ServiceType,
      icon: Mail,
      title: "Email Service",
      description:
        "Email service for sending emails.",
      color: "secondary" as const,
    },
    {
      type: "web-service" as ServiceType,
      icon: Server,
      title: "Web Services",
      description:
        "Dynamic web app. Ideal for full-stack apps, API servers, and mobile backends.",
      color: "secondary" as const,
    },
    {
      type: "private-service" as ServiceType,
      icon: Server,
      title: "Private Services",
      description:
        "Web app hosted on a private network, accessible only from your other Render services.",
      color: "destructive" as const,
    },
    {
      type: "background-worker" as ServiceType,
      icon: Rocket,
      title: "Background Workers",
      description:
        "Long-lived services that process async tasks, usually from a job queue.",
      color: "primary" as const,
    },
    {
      type: "cron-job" as ServiceType,
      icon: GitBranch,
      title: "Cron Jobs",
      description: "Short-lived tasks that run on a periodic schedule.",
      color: "secondary" as const,
    },
    {
      type: "database" as ServiceType,
      icon: Database,
      title: "Databases",
      description:
        "Managed Redis®-compatible storage. Ideal for shared cache, message broker, or job queue.",
      color: "destructive" as const,
    },
  ];

  const addEnvVar = () => {
    setEnvVars([...envVars, { key: "", value: "" }]);
  };

  const removeEnvVar = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index));
  };

  const updateEnvVar = (index: number, field: "key" | "value", value: string) => {
    const updated = [...envVars];
    updated[index][field] = value;
    setEnvVars(updated);
  };

  const handleDeploy = async () => {
    console.log({
      serviceType,
      gitUrl,
      projectName,
      branch,
      buildCommand,
      startCommand,
      outputDir,
      envVars,
    });
    setIsDeploying(true);
    setLogs([]);
    try {
      const routeMap: Record<string, string> = {
        "static-site": "staticSite",
        "email-service": "emailService",
        "web-service": "webService",
        "private-service": "privateService",
        "background-worker": "backgroundWorker",
        "cron-job": "cronJob",
        "database": "database",
      };
      const typeKey = serviceType ? routeMap[serviceType] || "staticSite" : "staticSite";
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:7830"}/deploy/${typeKey}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({
          gitURL : gitUrl,
          slug : projectName,
          startCommand : startCommand,
          buildCommand : buildCommand,
          outputDir : outputDir,
          envVars : envVars
        })
      });

      if (!response.ok) {
        // Try to parse the error message if the backend sent JSON
        try {
          const errData = await response.json();
          throw new Error(errData.error || `HTTP error! status: ${response.status}`);
        } catch(e) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          // SSE events look like "data: some log text\n\n"
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              try {
                const parsed = JSON.parse(data);
                if (parsed.status === 'queued') {
                  setLogs((prev) => [...prev, `Deployment queued: ${parsed.data.url}`]);
                  setTimeout(() => router.push("/dashboard"), 2000);
                  return;
                } else if (parsed.error) {
                  setLogs((prev) => [...prev, `Error: ${parsed.error}`]);
                  setIsDeploying(false);
                  return;
                } else if (parsed.log) {
                  setLogs((prev) => [...prev, parsed.log]);
                }
              } catch (e) {
                // Not valid JSON, just a plain string log
                setLogs((prev) => [...prev, data]);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Deployment error:", error);
      setLogs((prev) => [...prev, `Client error: ${error}`]);
    }
    setIsDeploying(false);
  };

  return (
    <div className="min-h-full bg-background square-grid relative overflow-hidden">
      {/* Floating stickers */}
      {/* <div className="absolute top-20 left-[10%] hidden lg:block z-[-1] pointer-events-none">
        <Sticker icon={Rocket} color="primary" size="md" rotation={-15} />
      </div>
      <div className="absolute top-40 right-[15%] hidden lg:block">
        <Sticker icon={Star} color="destructive" size="lg" rotation={20} />
      </div>
      <div className="absolute bottom-32 right-[20%] hidden lg:block">
        <Sticker icon={Heart} color="pink" size="md" rotation={-10} />
      </div> */}

      <div className="p-6 md:p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => (step === 1 ? router.push("/dashboard") : setStep(step - 1))}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="mb-2">
              Create a new <span className="doodle-underline">Service</span>
            </h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className={step >= 1 ? "text-primary font-medium" : ""}>
                1. Choose service
              </div>
              <ArrowRight className="w-4 h-4" />
              <div className={step >= 2 ? "text-primary font-medium" : ""}>
                2. Configure
              </div>
              <ArrowRight className="w-4 h-4" />
              <div className={step >= 3 ? "text-primary font-medium" : ""}>
                3. Deploy
              </div>
            </div>
          </div>

          {/* Step 1: Choose Service */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service, index) => {
                  const Icon = service.icon;
                  const isSelected = serviceType === service.type;
                  const isDisabled = service.type !== "static-site" && service.type !== "email-service";
                  return (
                    <button
                      key={service.type}
                      disabled={isDisabled}
                      onClick={() => {
                        if (!isDisabled) {
                          setServiceType(service.type);
                          setStep(2);
                        }
                      }}
                      className={`bg-card border-2 rounded-2xl p-6 text-left transition-all transform ${
                        isDisabled
                          ? "opacity-60 cursor-not-allowed border-border"
                          : `hover:shadow-xl hover:scale-105 ${
                              isSelected ? "border-primary shadow-xl" : "border-border"
                            }`
                      }`}
                      style={{
                        transform: `rotate(${index % 2 === 0 ? -0.5 : 0.5}deg)`,
                      }}
                    >
                      <div className="flex items-start gap-3 mb-4">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 ${service.color === "primary"
                            ? "bg-primary/10 border-primary/30"
                            : service.color === "secondary"
                              ? "bg-secondary/10 border-secondary/30"
                              : "bg-destructive/10 border-destructive/30"
                            }`}
                        >
                          <Icon className="w-6 h-6" />
                        </div>
                        {isDisabled && (
                          <span className="ml-auto text-xs font-medium bg-muted text-muted-foreground px-2 py-1 rounded-md">
                            Coming Soon
                          </span>
                        )}
                      </div>
                      <h3 className="mb-2">{service.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {service.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Configure */}
          {step === 2 && (
            <div className="bg-card border-2 border-primary/30 rounded-2xl p-8 shadow-xl">
              <h2 className="mb-6">Configure Deployment</h2>
              <div className="space-y-6">
                {/* Git URL */}
                <div className="space-y-2">
                  <Label htmlFor="gitUrl" className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-primary" />
                    Git Repository URL
                  </Label>
                  <Input
                    id="gitUrl"
                    placeholder="https://github.com/username/repo.git"
                    value={gitUrl}
                    onChange={(e) => setGitUrl(e.target.value)}
                    className="border-2 border-primary/20 focus:border-primary rounded-xl h-12"
                  />
                </div>

                {/* Project Name */}
                <div className="space-y-2">
                  <Label htmlFor="projectName">Project Name</Label>
                  <Input
                    id="projectName"
                    placeholder="my-awesome-project"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="border-2 border-primary/20 focus:border-primary rounded-xl h-12"
                  />
                  {projectName && (
                     <p className={`text-sm mt-1 ${isCheckingName ? "text-muted-foreground" : isNameAvailable ? "text-green-500" : "text-destructive"}`}>
                       {isCheckingName ? "Checking availability..." : isNameAvailable ? "Name is available!" : "Name is already taken."}
                     </p>
                  )}
                </div>

                {/* Branch */}
                <div className="space-y-2">
                  <Label htmlFor="branch">Branch</Label>
                  <Input
                    id="branch"
                    placeholder="main"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="border-2 border-primary/20 focus:border-primary rounded-xl h-12"
                  />
                </div>

                {/* Build Command */}
                {serviceType === "static-site" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="buildCommand">Build Command</Label>
                      <Input
                        id="buildCommand"
                        placeholder="npm run build"
                        value={buildCommand}
                        onChange={(e) => setBuildCommand(e.target.value)}
                        className="border-2 border-primary/20 focus:border-primary rounded-xl h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="outputDir">Publish Directory</Label>
                      <Input
                        id="outputDir"
                        placeholder="dist"
                        value={outputDir}
                        onChange={(e) => setOutputDir(e.target.value)}
                        className="border-2 border-primary/20 focus:border-primary rounded-xl h-12"
                      />
                    </div>
                  </>
                )}

                {/* Start Command */}
                {serviceType === "web-service" && (
                  <div className="space-y-2">
                    <Label htmlFor="startCommand">Start Command</Label>
                    <Input
                      id="startCommand"
                      placeholder="npm start"
                      value={startCommand}
                      onChange={(e) => setStartCommand(e.target.value)}
                      className="border-2 border-primary/20 focus:border-primary rounded-xl h-12"
                    />
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="border-2"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button 
                    onClick={() => setStep(3)} 
                    className="flex-1"
                    disabled={!projectName.trim() || isNameAvailable === false || isCheckingName}
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Environment Variables */}
          {step === 3 && (
            <div className="bg-card border-2 border-secondary/30 rounded-2xl p-8 shadow-xl">
              <h2 className="mb-6">Environment Variables</h2>
              <p className="text-muted-foreground mb-6">
                Add environment variables for your deployment
              </p>

              <div className="space-y-4 mb-6">
                {envVars.map((envVar, index) => (
                  <div key={index} className="flex gap-3">
                    <Input
                      placeholder="KEY"
                      value={envVar.key}
                      onChange={(e) => updateEnvVar(index, "key", e.target.value)}
                      className="border-2 border-secondary/20 rounded-xl h-12"
                    />
                    <Input
                      placeholder="value"
                      value={envVar.value}
                      onChange={(e) =>
                        updateEnvVar(index, "value", e.target.value)
                      }
                      className="border-2 border-secondary/20 rounded-xl h-12"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeEnvVar(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                onClick={addEnvVar}
                className="mb-6 border-2"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Variable
              </Button>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="border-2"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleDeploy}
                  disabled={isDeploying}
                  className="flex-1 bg-secondary hover:bg-secondary/90 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                >
                  {isDeploying ? "Deploying..." : "Deploy Now"}
                </Button>
              </div>

              {/* Logs Viewer */}
              {isDeploying && (
                <div className="mt-8 bg-black/90 p-4 rounded-xl border border-gray-800 font-mono text-sm text-green-400 h-64 overflow-y-auto">
                  {logs.length === 0 ? (
                    <div className="animate-pulse">Starting build environment...</div>
                  ) : (
                    logs.map((log, i) => (
                      <div key={i} className="whitespace-pre-wrap">{log}</div>
                    ))
                  )}
                  <div ref={logsEndRef} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}