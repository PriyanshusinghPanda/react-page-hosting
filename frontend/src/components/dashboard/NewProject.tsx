"use client";

import { useState } from "react";
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
} from "lucide-react";
import axios from "axios";

type ServiceType =
  | "static-site"
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

  const services = [
    {
      type: "static-site" as ServiceType,
      icon: Globe,
      title: "Static Sites",
      description:
        "Static content served over a global CDN. Ideal for frontend, blogs, and content sites.",
      color: "primary" as const,
      emoji: "🌐",
    },
    {
      type: "web-service" as ServiceType,
      icon: Server,
      title: "Web Services",
      description:
        "Dynamic web app. Ideal for full-stack apps, API servers, and mobile backends.",
      color: "secondary" as const,
      emoji: "⚡",
    },
    {
      type: "private-service" as ServiceType,
      icon: Server,
      title: "Private Services",
      description:
        "Web app hosted on a private network, accessible only from your other Render services.",
      color: "destructive" as const,
      emoji: "🔒",
    },
    {
      type: "background-worker" as ServiceType,
      icon: Rocket,
      title: "Background Workers",
      description:
        "Long-lived services that process async tasks, usually from a job queue.",
      color: "primary" as const,
      emoji: "🚀",
    },
    {
      type: "cron-job" as ServiceType,
      icon: GitBranch,
      title: "Cron Jobs",
      description: "Short-lived tasks that run on a periodic schedule.",
      color: "secondary" as const,
      emoji: "⏰",
    },
    {
      type: "database" as ServiceType,
      icon: Database,
      title: "Databases",
      description:
        "Managed Redis®-compatible storage. Ideal for shared cache, message broker, or job queue.",
      color: "destructive" as const,
      emoji: "💾",
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
    try {
      const response = await axios.post("http://localhost:7830/deploy/staticSite", {
        gitURL : gitUrl,
        slug : projectName
      }, { withCredentials: true });
      console.log(response.data)
    } catch (error) {
    }
    router.push("/dashboard");
  };

  return (
    <div className="min-h-full bg-background square-grid relative overflow-hidden">
      {/* Floating stickers */}
      <div className="absolute top-20 left-[10%] hidden lg:block">
        <Sticker icon={Rocket} color="primary" size="md" rotation={-15} />
      </div>
      <div className="absolute top-40 right-[15%] hidden lg:block">
        <Sticker icon={Star} color="destructive" size="lg" rotation={20} />
      </div>
      <div className="absolute bottom-32 right-[20%] hidden lg:block">
        <Sticker icon={Heart} color="pink" size="md" rotation={-10} />
      </div>

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
              Create a new <span className="doodle-underline">Service</span> 🚀
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
                  return (
                    <button
                      key={service.type}
                      onClick={() => {
                        setServiceType(service.type);
                        setStep(2);
                      }}
                      className={`bg-card border-2 rounded-2xl p-6 text-left hover:shadow-xl transition-all transform hover:scale-105 ${isSelected ? "border-primary shadow-xl" : "border-border"
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
                        <span className="text-2xl">{service.emoji}</span>
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
              <h2 className="mb-6">Configure Deployment 🔧</h2>
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
                  <Button onClick={() => setStep(3)} className="flex-1">
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
              <h2 className="mb-6">Environment Variables 🔐</h2>
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
                  className="flex-1 bg-secondary hover:bg-secondary/90 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                >
                  Deploy Now! 🚀
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}