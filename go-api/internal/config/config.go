package config

import (
	"bufio"
	"os"
	"path/filepath"
	"strings"
)

type Config struct {
	HTTPAddr            string
	DBHost              string
	DBPort              string
	DBName              string
	DBUser              string
	DBPass              string
	RootDir             string
	TrustProxySharedKey string
}

func Load() Config {
	root := findRoot()
	env := readEnv(filepath.Join(root, ".env"))

	return Config{
		HTTPAddr:            value(env, "GO_API_ADDR", "127.0.0.1:8081"),
		DBHost:              value(env, "DB_HOST", "127.0.0.1"),
		DBPort:              value(env, "DB_PORT", "3306"),
		DBName:              value(env, "DB_DATABASE", ""),
		DBUser:              value(env, "DB_USERNAME", "root"),
		DBPass:              value(env, "DB_PASSWORD", ""),
		RootDir:             root,
		TrustProxySharedKey: value(env, "TRUST_PROXY_SHARED_KEY", ""),
	}
}

func findRoot() string {
	dir, _ := os.Getwd()
	for {
		if _, err := os.Stat(filepath.Join(dir, ".env")); err == nil {
			return dir
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return dir
		}
		dir = parent
	}
}

func readEnv(path string) map[string]string {
	file, err := os.Open(path)
	if err != nil {
		return map[string]string{}
	}
	defer file.Close()

	values := map[string]string{}
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") || !strings.Contains(line, "=") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		values[strings.TrimSpace(parts[0])] = strings.Trim(strings.TrimSpace(parts[1]), `"'`)
	}
	return values
}

func value(values map[string]string, key string, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	if v := values[key]; v != "" {
		return v
	}
	return fallback
}
