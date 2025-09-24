Pod::Spec.new do |s|
  s.name         = "MediaPipePose"
  s.version      = "1.0.0"
  s.summary      = "MediaPipe pose detection for React Native"
  s.description  = "Native MediaPipe pose detection module with camera integration"
  s.homepage     = "https://github.com/captboscho/FitProof"
  s.license      = "MIT"
  s.author       = { "FitProof" => "support@fitproof.com" }
  s.platform     = :ios, "12.0"
  s.source       = { :path => "." }

  s.source_files = "ios/*.{h,m,swift}"
  s.public_header_files = "ios/*.h"
  s.requires_arc = true

  s.dependency "React-Core"
  s.dependency "MediaPipeTasksVision", "~> 0.10.9"

  # Swift version
  s.swift_version = "5.0"
end